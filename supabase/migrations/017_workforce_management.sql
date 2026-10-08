-- Migration 017: Admin & Delivery Workforce Management
-- 1. Convenience foreign keys for PostgREST joins
-- 2. Notification type check constraint extension
-- 3. RLS policies on deliveries and profiles for delivery workers
-- 4. Workforce RPCs: admin_promote_user, admin_demote_user, admin_assign_delivery, admin_unassign_delivery, delivery_update_status
-- 5. Workforce view helpers: get_delivery_boys_workload, get_admin_users

-- 1. Ensure app_role enum contains 'delivery_boy'
DO $$
BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_boy';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add convenience foreign keys for PostgREST joins if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.user_roles
            ADD CONSTRAINT user_roles_user_id_profiles_fkey
            FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
            ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_delivery_boy_profiles_fkey'
    ) THEN
        ALTER TABLE public.deliveries
            ADD CONSTRAINT deliveries_delivery_boy_profiles_fkey
            FOREIGN KEY (delivery_boy_id) REFERENCES public.profiles(user_id)
            ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_user_profiles_fkey'
    ) THEN
        ALTER TABLE public.deliveries
            ADD CONSTRAINT deliveries_user_profiles_fkey
            FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
            ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- 3. Update notification type check constraint to support workforce notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
    type::text = ANY (ARRAY[
        'order_placed', 'order_delivered', 'subscription_created',
        'subscription_paused', 'subscription_resumed', 'subscription_cancelled',
        'payment_success', 'payment_failed', 'offer', 'referral_reward',
        'admin_announcement', 'delivery_reminder', 'wallet_low_balance',
        'delivery_assigned', 'delivery_reassigned', 'delivery_unassigned'
    ]::text[])
);

-- 4. Helper function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE((SELECT is_blocked FROM public.profiles WHERE user_id = p_user_id), false);
$$;

-- 5. Hardened delivery update security trigger function
CREATE OR REPLACE FUNCTION public.check_delivery_update_security()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow service-role or admin full update capability
    IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
        RETURN NEW;
    END IF;

    -- Delivery partner / delivery boy restrictions
    IF public.has_role(auth.uid(), 'delivery_partner') OR public.has_role(auth.uid(), 'delivery_boy') THEN
        -- Delivery workers can only update deliveries assigned directly to them
        IF OLD.delivery_boy_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Unauthorized: Delivery workers can only update deliveries assigned to them';
        END IF;

        -- Blocked workers cannot update deliveries
        IF public.is_user_blocked(auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized: Suspended accounts cannot update deliveries';
        END IF;

        -- Delivery workers cannot reassign or change pricing/customer/order fields
        IF NEW.delivery_boy_id IS DISTINCT FROM OLD.delivery_boy_id OR
           NEW.delivery_partner_name IS DISTINCT FROM OLD.delivery_partner_name OR
           NEW.user_id IS DISTINCT FROM OLD.user_id OR
           NEW.order_id IS DISTINCT FROM OLD.order_id OR
           NEW.subscription_id IS DISTINCT FROM OLD.subscription_id OR
           NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit OR
           NEW.quantity IS DISTINCT FROM OLD.quantity OR
           NEW.delivery_type IS DISTINCT FROM OLD.delivery_type THEN
            RAISE EXCEPTION 'Unauthorized: Delivery workers cannot alter delivery assignment, pricing, or customer details';
        END IF;

        RETURN NEW;
    END IF;

    -- Protect customer-facing updates:
    -- 1. Customers cannot assign or change delivery partner / delivery boy
    IF NEW.delivery_boy_id IS DISTINCT FROM OLD.delivery_boy_id OR
       NEW.delivery_partner_name IS DISTINCT FROM OLD.delivery_partner_name THEN
        RAISE EXCEPTION 'Unauthorized: Customers cannot assign delivery partners';
    END IF;

    -- 2. Customers cannot mark deliveries as delivered or missed
    IF NEW.status IN ('delivered', 'missed') AND OLD.status NOT IN ('delivered', 'missed') THEN
        RAISE EXCEPTION 'Unauthorized: Customers cannot mark deliveries as delivered or missed';
    END IF;

    -- 3. Customers cannot alter canonical price or delivery type
    IF NEW.price_per_unit IS DISTINCT FROM OLD.price_per_unit OR
       NEW.delivery_type IS DISTINCT FROM OLD.delivery_type THEN
        RAISE EXCEPTION 'Unauthorized: Customers cannot alter delivery price or type';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. RLS Policies on deliveries for delivery workers
DROP POLICY IF EXISTS "Delivery partners can update deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery workers can view assigned deliveries" ON public.deliveries;
CREATE POLICY "Delivery workers can view assigned deliveries"
ON public.deliveries FOR SELECT
TO authenticated
USING (
    delivery_boy_id = auth.uid()
);

DROP POLICY IF EXISTS "Delivery workers can update assigned deliveries" ON public.deliveries;
CREATE POLICY "Delivery workers can update assigned deliveries"
ON public.deliveries FOR UPDATE
TO authenticated
USING (
    delivery_boy_id = auth.uid() 
    AND NOT public.is_user_blocked(auth.uid())
)
WITH CHECK (
    delivery_boy_id = auth.uid() 
    AND NOT public.is_user_blocked(auth.uid())
);

-- 7. RLS Policy on profiles: Delivery workers can view customer profile ONLY for assigned deliveries
DROP POLICY IF EXISTS "Delivery workers can view customer profile for assigned deliveries" ON public.profiles;
CREATE POLICY "Delivery workers can view customer profile for assigned deliveries"
ON public.profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.deliveries d
        WHERE d.user_id = profiles.user_id
          AND d.delivery_boy_id = auth.uid()
    )
);

-- 8. RPC: admin_promote_user
CREATE OR REPLACE FUNCTION public.admin_promote_user(
    p_user_id UUID,
    p_role app_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_target_profile RECORD;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    -- Validate target user exists
    SELECT id, user_id, full_name, is_blocked INTO v_target_profile
    FROM public.profiles
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    IF v_target_profile.is_blocked THEN
        RAISE EXCEPTION 'Cannot promote a suspended or blocked user';
    END IF;

    -- Insert role into user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If promoting to delivery_boy, also record delivery_partner compatibility
    IF p_role = 'delivery_boy' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, 'delivery_partner')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Log admin action
    INSERT INTO public.admin_logs (
        admin_id, action, target_type, target_id, details
    ) VALUES (
        v_admin_id,
        'add_' || p_role::text,
        'user',
        p_user_id,
        jsonb_build_object(
            'role', p_role,
            'user_id', p_user_id,
            'full_name', v_target_profile.full_name,
            'promoted_by', v_admin_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'role', p_role
    );
END;
$$;

-- 9. RPC: admin_demote_user
CREATE OR REPLACE FUNCTION public.admin_demote_user(
    p_user_id UUID,
    p_role app_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_admin_count INT;
    v_active_deliveries_count INT;
    v_target_profile RECORD;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    SELECT id, user_id, full_name, is_blocked INTO v_target_profile
    FROM public.profiles
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- Check last admin protection if demoting admin
    IF p_role = 'admin' THEN
        SELECT COUNT(DISTINCT user_id) INTO v_admin_count
        FROM public.user_roles
        WHERE role = 'admin';

        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot remove the last remaining administrator.';
        END IF;

        -- Prevent self-lockout if caller is the only active unblocked admin
        IF v_admin_id = p_user_id THEN
            SELECT COUNT(DISTINCT ur.user_id) INTO v_admin_count
            FROM public.user_roles ur
            JOIN public.profiles p ON ur.user_id = p.user_id
            WHERE ur.role = 'admin' AND ur.user_id != v_admin_id AND p.is_blocked = false;

            IF v_admin_count < 1 THEN
                RAISE EXCEPTION 'Cannot demote yourself: No other active administrator exists.';
            END IF;
        END IF;

        DELETE FROM public.user_roles
        WHERE user_id = p_user_id AND role = 'admin';

        -- Ensure user retains customer role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, 'customer')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Check active deliveries if demoting delivery boy
    IF p_role IN ('delivery_boy', 'delivery_partner') THEN
        SELECT COUNT(*) INTO v_active_deliveries_count
        FROM public.deliveries
        WHERE delivery_boy_id = p_user_id
          AND status IN ('upcoming', 'in_progress');

        IF v_active_deliveries_count > 0 THEN
            RAISE EXCEPTION 'Cannot remove delivery worker role: Worker has % active assigned deliveries. Please reassign or unassign active deliveries first.', v_active_deliveries_count;
        END IF;

        DELETE FROM public.user_roles
        WHERE user_id = p_user_id AND role IN ('delivery_boy', 'delivery_partner');

        -- Ensure user retains customer role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, 'customer')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Log admin action
    INSERT INTO public.admin_logs (
        admin_id, action, target_type, target_id, details
    ) VALUES (
        v_admin_id,
        'remove_' || p_role::text,
        'user',
        p_user_id,
        jsonb_build_object(
            'removed_role', p_role,
            'user_id', p_user_id,
            'full_name', v_target_profile.full_name,
            'demoted_by', v_admin_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'removed_role', p_role
    );
END;
$$;

-- 10. RPC: admin_assign_delivery
CREATE OR REPLACE FUNCTION public.admin_assign_delivery(
    p_delivery_id UUID,
    p_delivery_boy_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_delivery RECORD;
    v_boy_profile RECORD;
    v_old_boy_id UUID;
    v_is_reassignment BOOLEAN;
    v_has_worker_role BOOLEAN;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required';
    END IF;

    IF p_delivery_id IS NULL THEN
        RAISE EXCEPTION 'Delivery ID is required';
    END IF;

    IF p_delivery_boy_id IS NULL THEN
        RAISE EXCEPTION 'Delivery worker ID is required';
    END IF;

    -- Lock delivery row for update to prevent race conditions
    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery not found';
    END IF;

    -- Status validity checks
    IF v_delivery.status = 'delivered' THEN
        RAISE EXCEPTION 'Cannot assign or reassign an already delivered delivery';
    END IF;

    IF v_delivery.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot assign or reassign a cancelled delivery';
    END IF;

    -- Validate target delivery worker profile & role
    SELECT id, user_id, full_name, is_blocked INTO v_boy_profile
    FROM public.profiles
    WHERE user_id = p_delivery_boy_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target delivery worker not found';
    END IF;

    IF v_boy_profile.is_blocked THEN
        RAISE EXCEPTION 'Cannot assign delivery to a suspended or blocked worker';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_delivery_boy_id
          AND role IN ('delivery_boy', 'delivery_partner')
    ) INTO v_has_worker_role;

    IF NOT v_has_worker_role THEN
        RAISE EXCEPTION 'Target user does not have delivery worker role';
    END IF;

    -- Check if already assigned to the same worker
    IF v_delivery.delivery_boy_id = p_delivery_boy_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Already assigned to this worker',
            'delivery_id', p_delivery_id,
            'delivery_boy_id', p_delivery_boy_id
        );
    END IF;

    v_old_boy_id := v_delivery.delivery_boy_id;
    v_is_reassignment := (v_old_boy_id IS NOT NULL);

    -- Perform assignment update
    UPDATE public.deliveries
    SET delivery_boy_id = p_delivery_boy_id,
        delivery_partner_name = COALESCE(v_boy_profile.full_name, 'Delivery Partner'),
        assigned_at = now(),
        assigned_by = v_admin_id,
        notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes || E'\n', '') || p_notes ELSE notes END,
        updated_at = now()
    WHERE id = p_delivery_id;

    -- Log admin action
    INSERT INTO public.admin_logs (
        admin_id, action, target_type, target_id, details
    ) VALUES (
        v_admin_id,
        CASE WHEN v_is_reassignment THEN 'reassign_delivery' ELSE 'assign_delivery' END,
        'delivery',
        p_delivery_id,
        jsonb_build_object(
            'delivery_id', p_delivery_id,
            'order_id', v_delivery.order_id,
            'previous_delivery_boy_id', v_old_boy_id,
            'new_delivery_boy_id', p_delivery_boy_id,
            'worker_name', v_boy_profile.full_name
        )
    );

    -- Notify new delivery worker
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_order_id,
        related_subscription_id,
        action_url,
        metadata
    ) VALUES (
        p_delivery_boy_id,
        CASE WHEN v_is_reassignment THEN 'delivery_reassigned' ELSE 'delivery_assigned' END,
        CASE WHEN v_is_reassignment THEN 'Delivery Reassigned' ELSE 'New Delivery Assigned' END,
        'Delivery for ' || to_char(v_delivery.delivery_date, 'Mon DD, YYYY') || ' has been assigned to you.',
        v_delivery.order_id,
        v_delivery.subscription_id,
        '/delivery',
        jsonb_build_object('delivery_id', p_delivery_id, 'action', 'assignment')
    );

    -- If reassigned, notify previous worker
    IF v_is_reassignment AND v_old_boy_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            related_order_id,
            related_subscription_id,
            action_url,
            metadata
        ) VALUES (
            v_old_boy_id,
            'delivery_reassigned',
            'Delivery Reassigned Away',
            'Delivery for ' || to_char(v_delivery.delivery_date, 'Mon DD, YYYY') || ' has been reassigned to another partner.',
            v_delivery.order_id,
            v_delivery.subscription_id,
            '/delivery',
            jsonb_build_object('delivery_id', p_delivery_id, 'action', 'reassigned_away')
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', p_delivery_id,
        'delivery_boy_id', p_delivery_boy_id,
        'is_reassignment', v_is_reassignment
    );
END;
$$;

-- 11. RPC: admin_unassign_delivery
CREATE OR REPLACE FUNCTION public.admin_unassign_delivery(
    p_delivery_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_delivery RECORD;
    v_old_boy_id UUID;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required';
    END IF;

    IF p_delivery_id IS NULL THEN
        RAISE EXCEPTION 'Delivery ID is required';
    END IF;

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery not found';
    END IF;

    IF v_delivery.status = 'delivered' THEN
        RAISE EXCEPTION 'Cannot unassign an already delivered delivery';
    END IF;

    IF v_delivery.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot unassign a cancelled delivery';
    END IF;

    IF v_delivery.delivery_boy_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Delivery is already unassigned',
            'delivery_id', p_delivery_id
        );
    END IF;

    v_old_boy_id := v_delivery.delivery_boy_id;

    -- Unassign delivery
    UPDATE public.deliveries
    SET delivery_boy_id = NULL,
        delivery_partner_name = NULL,
        assigned_at = NULL,
        assigned_by = NULL,
        notes = CASE WHEN p_reason IS NOT NULL THEN COALESCE(notes || E'\n', '') || 'Unassigned: ' || p_reason ELSE notes END,
        updated_at = now()
    WHERE id = p_delivery_id;

    -- Log admin action
    INSERT INTO public.admin_logs (
        admin_id, action, target_type, target_id, details
    ) VALUES (
        v_admin_id,
        'unassign_delivery',
        'delivery',
        p_delivery_id,
        jsonb_build_object(
            'delivery_id', p_delivery_id,
            'order_id', v_delivery.order_id,
            'previous_delivery_boy_id', v_old_boy_id,
            'reason', p_reason
        )
    );

    -- Notify previous worker
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_order_id,
        related_subscription_id,
        action_url,
        metadata
    ) VALUES (
        v_old_boy_id,
        'delivery_unassigned',
        'Delivery Unassigned',
        'Delivery for ' || to_char(v_delivery.delivery_date, 'Mon DD, YYYY') || ' has been unassigned.',
        v_delivery.order_id,
        v_delivery.subscription_id,
        '/delivery',
        jsonb_build_object('delivery_id', p_delivery_id, 'action', 'unassigned')
    );

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', p_delivery_id,
        'previous_delivery_boy_id', v_old_boy_id
    );
END;
$$;

-- 12. RPC: delivery_update_status
CREATE OR REPLACE FUNCTION public.delivery_update_status(
    p_delivery_id UUID,
    p_new_status delivery_status,
    p_proof_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN;
    v_delivery RECORD;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check if caller is blocked
    IF public.is_user_blocked(v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Account is suspended';
    END IF;

    v_is_admin := public.has_role(v_caller_id, 'admin');

    SELECT * INTO v_delivery
    FROM public.deliveries
    WHERE id = p_delivery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery not found';
    END IF;

    -- Authorization check: caller must be admin or assigned delivery worker
    IF NOT v_is_admin AND (v_delivery.delivery_boy_id IS DISTINCT FROM v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: You are not assigned to this delivery';
    END IF;

    -- State transition validation
    -- Immutable terminal states
    IF v_delivery.status = 'delivered' THEN
        RAISE EXCEPTION 'Cannot modify an already delivered delivery';
    END IF;

    IF v_delivery.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot modify a cancelled delivery';
    END IF;

    -- Valid state transitions
    IF v_delivery.status = 'upcoming' AND p_new_status NOT IN ('in_progress', 'cancelled', 'failed', 'delivered') THEN
        RAISE EXCEPTION 'Invalid status transition from upcoming to %', p_new_status;
    END IF;

    IF v_delivery.status = 'in_progress' AND p_new_status NOT IN ('delivered', 'failed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from in_progress to %', p_new_status;
    END IF;

    -- Update delivery
    UPDATE public.deliveries
    SET status = p_new_status,
        delivery_proof_url = COALESCE(p_proof_url, delivery_proof_url),
        notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes || E'\n', '') || p_notes ELSE notes END,
        marked_delivered_at = CASE WHEN p_new_status = 'delivered' THEN now() ELSE marked_delivered_at END,
        marked_delivered_by = CASE WHEN p_new_status = 'delivered' THEN v_caller_id ELSE marked_delivered_by END,
        delivery_time = CASE WHEN p_new_status = 'delivered' THEN now() ELSE delivery_time END,
        updated_at = now()
    WHERE id = p_delivery_id;

    -- If delivery completed and associated order is COD, sync payment
    IF p_new_status = 'delivered' AND v_delivery.order_id IS NOT NULL THEN
        UPDATE public.orders
        SET delivery_status = 'delivered',
            payment_status = CASE WHEN payment_method = 'cod' THEN 'paid' ELSE payment_status END,
            updated_at = now()
        WHERE id = v_delivery.order_id;
    END IF;

    -- Log status update in admin_logs
    INSERT INTO public.admin_logs (
        admin_id, action, target_type, target_id, details
    ) VALUES (
        v_caller_id,
        'delivery_status_update',
        'delivery',
        p_delivery_id,
        jsonb_build_object(
            'delivery_id', p_delivery_id,
            'previous_status', v_delivery.status,
            'new_status', p_new_status,
            'is_admin', v_is_admin
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', p_delivery_id,
        'old_status', v_delivery.status,
        'new_status', p_new_status
    );
END;
$$;

-- 13. Function to query delivery boys workload
CREATE OR REPLACE FUNCTION public.get_delivery_boys_workload()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    is_blocked BOOLEAN,
    created_at TIMESTAMPTZ,
    role app_role,
    active_deliveries_count BIGINT,
    completed_deliveries_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        p.id,
        p.user_id,
        p.full_name,
        p.email,
        p.phone,
        p.is_blocked,
        p.created_at,
        ur.role,
        COUNT(d.id) FILTER (WHERE d.status IN ('upcoming', 'in_progress')) AS active_deliveries_count,
        COUNT(d.id) FILTER (WHERE d.status = 'delivered') AS completed_deliveries_count
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    LEFT JOIN public.deliveries d ON d.delivery_boy_id = p.user_id
    WHERE ur.role IN ('delivery_boy', 'delivery_partner')
      AND (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
    GROUP BY p.id, p.user_id, p.full_name, p.email, p.phone, p.is_blocked, p.created_at, ur.role
    ORDER BY p.full_name ASC;
$$;

-- 14. Function to query admins list
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    is_blocked BOOLEAN,
    created_at TIMESTAMPTZ,
    role app_role,
    role_assigned_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    total_actions_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        p.id,
        p.user_id,
        p.full_name,
        p.email,
        p.phone,
        p.is_blocked,
        p.created_at,
        ur.role,
        ur.created_at AS role_assigned_at,
        (SELECT MAX(created_at) FROM public.admin_logs WHERE admin_id = p.user_id) AS last_active_at,
        (SELECT COUNT(*) FROM public.admin_logs WHERE admin_id = p.user_id) AS total_actions_count
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    WHERE ur.role = 'admin'
      AND (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
    ORDER BY p.created_at ASC;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_blocked(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_promote_user(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_demote_user(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_delivery(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unassign_delivery(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delivery_update_status(UUID, delivery_status, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_boys_workload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
