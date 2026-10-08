-- =====================================================
-- 018_role_integrity_hardening.sql
-- Phase 12.7B: Role Integrity, Privilege Escalation & Registration Hardening
-- =====================================================
-- AUDIT FINDINGS ADDRESSED:
-- 1. Duplicate rows in get_delivery_boys_workload for users with both delivery_boy + delivery_partner
-- 2. Customer self-escalation: Ensure handle_new_user never assigns privileged roles
-- 3. delivery_boy role verification: add get_my_delivery_worker_profile() RPC for portal self-check
-- 4. Admin count improvement: count only UNBLOCKED admins for last-admin protection
-- 5. Role combination integrity: validate_user_role_integrity() for admin audit
-- 6. Notification type expansion: role_assigned, role_removed, delivery_status_changed
-- 7. Secure registration: register_privileged_user() RPC for admin-initiated privileged setup
-- 8. Tighten user_roles RLS: no non-admin writes
-- =====================================================

-- -------------------------------------------------------
-- 1. FIX: get_delivery_boys_workload -- deduplicate by user
-- Users with both 'delivery_boy' AND 'delivery_partner' roles
-- were appearing twice. Use DISTINCT ON to deduplicate.
-- -------------------------------------------------------
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
    WITH worker_roles AS (
        SELECT DISTINCT ON (ur.user_id)
            ur.user_id,
            -- Prefer 'delivery_boy' label when user holds both roles
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM public.user_roles ur2
                    WHERE ur2.user_id = ur.user_id AND ur2.role = 'delivery_boy'
                ) THEN 'delivery_boy'::app_role
                ELSE ur.role
            END AS role
        FROM public.user_roles ur
        WHERE ur.role IN ('delivery_boy', 'delivery_partner')
        ORDER BY ur.user_id,
            CASE WHEN ur.role = 'delivery_boy' THEN 0 ELSE 1 END
    )
    SELECT
        p.id,
        p.user_id,
        p.full_name,
        p.email,
        p.phone,
        p.is_blocked,
        p.created_at,
        wr.role,
        COUNT(d.id) FILTER (WHERE d.status IN ('upcoming', 'in_progress')) AS active_deliveries_count,
        COUNT(d.id) FILTER (WHERE d.status = 'delivered') AS completed_deliveries_count
    FROM worker_roles wr
    JOIN public.profiles p ON wr.user_id = p.user_id
    LEFT JOIN public.deliveries d ON d.delivery_boy_id = p.user_id
    WHERE (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
    GROUP BY p.id, p.user_id, p.full_name, p.email, p.phone, p.is_blocked, p.created_at, wr.role
    ORDER BY p.full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_boys_workload() TO authenticated;

-- -------------------------------------------------------
-- 2. FIX: admin_demote_user -- improved last-admin protection
-- Count only UNBLOCKED admins to prevent effective lockout.
-- -------------------------------------------------------
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
    v_active_admin_count INT;
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

    IF p_role = 'admin' THEN
        -- HARDENED: Count only active (unblocked) admins
        SELECT COUNT(DISTINCT ur.user_id) INTO v_active_admin_count
        FROM public.user_roles ur
        JOIN public.profiles pr ON ur.user_id = pr.user_id
        WHERE ur.role = 'admin'
          AND pr.is_blocked = false;

        IF v_active_admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot remove the last remaining active administrator. Ensure another active (unblocked) administrator exists first.';
        END IF;

        -- Self-demotion check: verify other unblocked admins exist excluding self
        IF v_admin_id = p_user_id THEN
            SELECT COUNT(DISTINCT ur.user_id) INTO v_active_admin_count
            FROM public.user_roles ur
            JOIN public.profiles pr ON ur.user_id = pr.user_id
            WHERE ur.role = 'admin'
              AND ur.user_id != v_admin_id
              AND pr.is_blocked = false;

            IF v_active_admin_count < 1 THEN
                RAISE EXCEPTION 'Cannot demote yourself: No other active (unblocked) administrator exists.';
            END IF;
        END IF;

        DELETE FROM public.user_roles
        WHERE user_id = p_user_id AND role = 'admin';

        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, 'customer')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

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

        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, 'customer')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

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

GRANT EXECUTE ON FUNCTION public.admin_demote_user(UUID, app_role) TO authenticated;

-- -------------------------------------------------------
-- 3. NEW RPC: get_my_delivery_worker_profile()
-- DeliveryBoyPortal uses this to verify caller role before
-- rendering the portal. Returns error if not a worker.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_delivery_worker_profile()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_profile RECORD;
    v_is_worker BOOLEAN;
    v_is_blocked BOOLEAN;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('is_worker', false, 'error', 'Authentication required');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = v_caller_id
          AND role IN ('delivery_boy', 'delivery_partner')
    ) INTO v_is_worker;

    SELECT is_blocked INTO v_is_blocked
    FROM public.profiles
    WHERE user_id = v_caller_id;

    IF NOT v_is_worker THEN
        RETURN jsonb_build_object(
            'is_worker', false,
            'is_blocked', COALESCE(v_is_blocked, false),
            'error', 'User does not have delivery worker role'
        );
    END IF;

    IF COALESCE(v_is_blocked, false) THEN
        RETURN jsonb_build_object(
            'is_worker', true,
            'is_blocked', true,
            'error', 'Account is suspended. Contact administrator.'
        );
    END IF;

    SELECT user_id, full_name, email, phone, created_at INTO v_profile
    FROM public.profiles
    WHERE user_id = v_caller_id;

    RETURN jsonb_build_object(
        'is_worker', true,
        'is_blocked', false,
        'user_id', v_caller_id,
        'full_name', v_profile.full_name,
        'email', v_profile.email,
        'phone', v_profile.phone
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_delivery_worker_profile() TO authenticated;

-- -------------------------------------------------------
-- 4. NEW RPC: validate_user_role_integrity()
-- Admin audit tool: returns users with role integrity issues.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_user_role_integrity()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    roles TEXT[],
    issue TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    -- Users missing 'customer' base role
    SELECT
        p.user_id,
        p.full_name,
        p.email,
        ARRAY_AGG(COALESCE(ur.role::text, 'none') ORDER BY COALESCE(ur.role::text, 'none')) AS roles,
        'Missing customer base role' AS issue
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE (public.has_role(auth.uid(), 'admin'))
    GROUP BY p.user_id, p.full_name, p.email
    HAVING NOT (ARRAY_AGG(COALESCE(ur.role::text, '')) @> ARRAY['customer'])
       AND COUNT(ur.role) > 0

    UNION ALL

    -- Orphaned user_roles with no matching profile
    SELECT
        ur.user_id,
        NULL::TEXT AS full_name,
        NULL::TEXT AS email,
        ARRAY_AGG(ur.role::text ORDER BY ur.role::text) AS roles,
        'user_roles without matching profile' AS issue
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE p.user_id IS NULL
      AND public.has_role(auth.uid(), 'admin')
    GROUP BY ur.user_id

    ORDER BY issue, full_name;
$$;

GRANT EXECUTE ON FUNCTION public.validate_user_role_integrity() TO authenticated;

-- -------------------------------------------------------
-- 5. NEW RPC: register_privileged_user()
-- Admin-only RPC to grant admin or delivery_boy role by email.
-- User must already have registered a normal account.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_privileged_user(
    p_email TEXT,
    p_role app_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_target_id UUID;
    v_target_profile RECORD;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required';
    END IF;

    IF p_email IS NULL OR trim(p_email) = '' THEN
        RAISE EXCEPTION 'Email address is required';
    END IF;

    IF p_role NOT IN ('admin', 'delivery_boy') THEN
        RAISE EXCEPTION 'Only admin and delivery_boy roles can be granted via privileged registration';
    END IF;

    SELECT id INTO v_target_id
    FROM auth.users
    WHERE email = lower(trim(p_email));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account found with email: %. User must sign up first.', p_email;
    END IF;

    SELECT user_id, full_name, is_blocked INTO v_target_profile
    FROM public.profiles
    WHERE user_id = v_target_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found. The account may not have completed registration.';
    END IF;

    IF v_target_profile.is_blocked THEN
        RAISE EXCEPTION 'Cannot grant role to a suspended account.';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_target_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    IF p_role = 'delivery_boy' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_target_id, 'delivery_partner')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    INSERT INTO public.admin_logs (
        admin_id, action, target_type, target_id, details
    ) VALUES (
        v_admin_id,
        'privileged_registration_' || p_role::text,
        'user',
        v_target_id,
        jsonb_build_object(
            'email', p_email,
            'role', p_role,
            'user_id', v_target_id,
            'full_name', v_target_profile.full_name,
            'granted_by', v_admin_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_id,
        'email', p_email,
        'role', p_role,
        'full_name', v_target_profile.full_name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_privileged_user(TEXT, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.register_privileged_user(TEXT, app_role) FROM anon;

-- -------------------------------------------------------
-- 6. HARDEN: handle_new_user() -- always only 'customer' on signup
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = now();

    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- HARDENED: ALWAYS and ONLY assign 'customer' on signup.
    -- Privileged roles (admin, delivery_boy) must be granted via admin RPCs only.
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------
-- 7. TIGHTEN: user_roles RLS -- no non-admin writes
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- -------------------------------------------------------
-- 8. EXPAND notification type constraint
-- -------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
    type::text = ANY (ARRAY[
        'order_placed', 'order_delivered', 'subscription_created',
        'subscription_paused', 'subscription_resumed', 'subscription_cancelled',
        'payment_success', 'payment_failed', 'offer', 'referral_reward',
        'admin_announcement', 'delivery_reminder', 'wallet_low_balance',
        'delivery_assigned', 'delivery_reassigned', 'delivery_unassigned',
        'delivery_status_changed', 'role_assigned', 'role_removed',
        'account_suspended', 'account_reinstated'
    ]::text[])
);

-- -------------------------------------------------------
-- 9. Role change notification trigger
-- Notify users when their privileged role changes
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS TRIGGER AS $$
DECLARE
    v_type TEXT;
    v_title TEXT;
    v_message TEXT;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.role::text IN ('admin', 'delivery_boy', 'delivery_partner') THEN
        v_type := 'role_assigned';
        v_title := 'Role Assigned';
        v_message := 'Your account has been granted the ' || NEW.role::text || ' role by an administrator.';

        BEGIN
            INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
            VALUES (
                NEW.user_id, v_type, v_title, v_message,
                CASE WHEN NEW.role::text IN ('delivery_boy', 'delivery_partner') THEN '/delivery' ELSE '/dashboard' END,
                jsonb_build_object('role', NEW.role, 'action', 'assigned')
            );
        EXCEPTION WHEN OTHERS THEN
            -- Silently ignore notification failures to not block role grants
            NULL;
        END;
    END IF;

    IF TG_OP = 'DELETE' AND OLD.role::text IN ('admin', 'delivery_boy', 'delivery_partner') THEN
        v_type := 'role_removed';
        v_title := 'Role Removed';
        v_message := 'Your ' || OLD.role::text || ' role has been removed. You retain standard customer access.';

        BEGIN
            INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
            VALUES (
                OLD.user_id, v_type, v_title, v_message,
                '/dashboard',
                jsonb_build_object('role', OLD.role, 'action', 'removed')
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS notify_on_role_change ON public.user_roles;
CREATE TRIGGER notify_on_role_change
    AFTER INSERT OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_role_change();
