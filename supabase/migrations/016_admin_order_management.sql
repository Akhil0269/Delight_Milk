-- =====================================================
-- 016_admin_order_management.sql
-- Delight Milk: Admin Order Management Support (Phase 12.6)
-- Additive Only - Safe, Transactional, Idempotent, RLS Enforced
-- =====================================================

-- 1. Ensure profiles.user_id has a unique constraint (required for FK target)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND contype = 'u'
          AND conname = 'profiles_user_id_unique'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- 2. Add convenience FK from public.orders.user_id → public.profiles.user_id
--    Enables PostgREST to join customer profile data in admin queries.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.orders'::regclass
          AND conname = 'orders_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_user_id_profiles_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.profiles(user_id)
            ON DELETE CASCADE
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

COMMENT ON CONSTRAINT orders_user_id_profiles_fkey ON public.orders IS
'Additional FK from orders.user_id → profiles.user_id to enable PostgREST joins for admin queries.';

-- 3. Admin Order Cancellation RPC (Atomic with Wallet Refund & Audit Logging)
CREATE OR REPLACE FUNCTION public.admin_cancel_order(
    p_order_id uuid,
    p_admin_id uuid,
    p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_caller_id uuid;
    v_order public.orders;
    v_cancel_result JSONB;
BEGIN
    -- 1. Security & Admin Guard (authoritative role check)
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL OR NOT public.has_role(v_caller_id, 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required');
    END IF;

    -- 2. Lock Order Row FOR UPDATE
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 3. Validate Status Transitions
    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order is already cancelled');
    END IF;

    IF v_order.status = 'delivered' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivered orders cannot be cancelled');
    END IF;

    -- 4. Delegate to atomic cancellation & refund function (handles wallet refund & upcoming delivery cancellation)
    SELECT public.cancel_order_with_refund(p_order_id) INTO v_cancel_result;
    IF v_cancel_result->>'success' = 'false' THEN
        RETURN v_cancel_result;
    END IF;

    -- 5. Audit Logging with authoritative caller ID (prevents spoofing; target_id is uuid)
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
        v_caller_id,
        'cancel_order',
        'order',
        p_order_id,
        jsonb_build_object(
            'order_id', p_order_id,
            'user_id', v_order.user_id,
            'status_before', v_order.status,
            'payment_method', v_order.payment_method,
            'payment_status', v_order.payment_status,
            'total_amount', v_order.total_amount,
            'reason', p_reason,
            'cancelled_at', now()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'refunded', (v_order.payment_method = 'wallet' AND v_order.payment_status = 'paid'),
        'refund_amount', CASE WHEN v_order.payment_method = 'wallet' AND v_order.payment_status = 'paid'
                              THEN v_order.total_amount ELSE 0 END
    );
END;
$function$;

COMMENT ON FUNCTION public.admin_cancel_order(uuid, uuid, text) IS
'Authoritative admin RPC to atomically cancel an order, process wallet refund if paid, update linked deliveries, and write admin audit log.';

REVOKE EXECUTE ON FUNCTION public.admin_cancel_order(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cancel_order(uuid, uuid, text) TO authenticated, service_role, postgres;

-- 4. Admin Order Status Update RPC (Strict Transitions & Audit Logging)
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id uuid,
    p_admin_id uuid,
    p_new_status order_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_caller_id uuid;
    v_order public.orders;
BEGIN
    -- 1. Security & Admin Guard (authoritative role check)
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL OR NOT public.has_role(v_caller_id, 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required');
    END IF;

    -- 2. Lock Order Row FOR UPDATE
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 3. Strict Status Transition Guards
    IF v_order.status = 'delivered' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivered orders cannot have their status changed');
    END IF;

    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cancelled orders cannot have their status changed. Use cancellation flow instead.');
    END IF;

    IF p_new_status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Use admin_cancel_order() for cancellation to ensure atomic refund handling.');
    END IF;

    -- 4. Status Transition & Synchronization
    IF p_new_status = 'delivered' THEN
        -- Mark order as delivered
        -- If COD order was pending, mark as paid upon delivery completion
        IF v_order.payment_method = 'cod' AND v_order.payment_status = 'pending' THEN
            UPDATE public.orders
            SET status = 'delivered',
                payment_status = 'paid',
                updated_at = now()
            WHERE id = p_order_id;
        ELSE
            UPDATE public.orders
            SET status = 'delivered',
                updated_at = now()
            WHERE id = p_order_id;
        END IF;

        -- Synchronize linked delivery if it exists and is upcoming/in_progress
        UPDATE public.deliveries
        SET status = 'delivered',
            marked_delivered_at = now(),
            marked_delivered_by = v_caller_id,
            updated_at = now()
        WHERE (order_id = p_order_id OR id = v_order.delivery_id)
          AND status IN ('upcoming', 'in_progress');
    ELSE
        UPDATE public.orders
        SET status = p_new_status,
            updated_at = now()
        WHERE id = p_order_id;
    END IF;

    -- 5. Audit Logging with authoritative caller ID (target_id is uuid)
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
        v_caller_id,
        'update_order_status',
        'order',
        p_order_id,
        jsonb_build_object(
            'order_id', p_order_id,
            'status_before', v_order.status,
            'status_after', p_new_status,
            'payment_status_before', v_order.payment_status,
            'payment_method', v_order.payment_method,
            'updated_at', now()
        )
    );

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', p_new_status);
END;
$function$;

COMMENT ON FUNCTION public.admin_update_order_status(uuid, uuid, order_status) IS
'Authoritative admin RPC to update order status, synchronize COD payment on delivery, update linked deliveries, and write admin audit log.';

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, uuid, order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, uuid, order_status) TO authenticated, service_role, postgres;
