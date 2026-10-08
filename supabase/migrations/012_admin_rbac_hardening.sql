-- =====================================================
-- 012_admin_rbac_hardening.sql
-- Delight Milk: Admin Authentication & RBAC Hardening
-- =====================================================

-- 1. Harden promote_user_to_admin() to require admin caller
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _user_id UUID;
BEGIN
    -- If called from an authenticated client session, verify admin role
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Administrator privileges required');
    END IF;

    SELECT id INTO _user_id FROM auth.users WHERE email = target_email;
    IF _user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User with email not found in auth.users');
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'user_id', _user_id, 'role', 'admin');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT) FROM anon;

-- 2. Harden admin_correct_delivery() to ensure caller authentication & authorization
CREATE OR REPLACE FUNCTION public.admin_correct_delivery(
    _delivery_id UUID,
    _admin_id UUID,
    _new_status public.delivery_status,
    _correction_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _delivery RECORD;
    _is_admin BOOLEAN;
    _is_locked BOOLEAN;
BEGIN
    -- Verify caller is an admin and that caller matches _admin_id if authenticated
    IF auth.uid() IS NOT NULL THEN
        IF NOT public.has_role(auth.uid(), 'admin') OR auth.uid() <> _admin_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized - caller must be an authorized admin');
        END IF;
    ELSE
        SELECT public.has_role(_admin_id, 'admin') INTO _is_admin;
        IF NOT _is_admin THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized - admin access required');
        END IF;
    END IF;
    
    SELECT * INTO _delivery
    FROM public.deliveries
    WHERE id = _delivery_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found');
    END IF;
    
    SELECT public.is_month_locked_for_billing(_delivery.user_id, _delivery.delivery_date)
    INTO _is_locked;
    
    IF _is_locked THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot modify delivery - month is locked for billing.');
    END IF;
    
    IF _correction_reason IS NULL OR trim(_correction_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Correction reason is required');
    END IF;
    
    -- Insert audit log
    INSERT INTO public.delivery_audit_log (
        delivery_id,
        user_id,
        delivery_date,
        old_status,
        new_status,
        changed_by,
        reason,
        is_admin_correction
    ) VALUES (
        _delivery_id,
        _delivery.user_id,
        _delivery.delivery_date,
        _delivery.status,
        _new_status,
        _admin_id,
        _correction_reason,
        true
    );
    
    -- Update delivery
    UPDATE public.deliveries
    SET 
        status = _new_status,
        delivered_at = CASE WHEN _new_status = 'delivered' THEN COALESCE(delivered_at, now()) ELSE delivered_at END,
        updated_at = now()
    WHERE id = _delivery_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', _delivery_id,
        'old_status', _delivery.status,
        'new_status', _new_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_correct_delivery(UUID, UUID, public.delivery_status, TEXT) FROM anon;

-- 3. Harden lock_month_for_billing()
CREATE OR REPLACE FUNCTION public.lock_month_for_billing(
    _user_id UUID,
    _billing_month DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _locked_count INTEGER;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required');
    END IF;

    UPDATE public.deliveries
    SET 
        is_locked = true,
        locked_at = now(),
        locked_reason = 'Month-end billing completed'
    WHERE user_id = _user_id
    AND date_trunc('month', delivery_date) = date_trunc('month', _billing_month)
    AND status = 'delivered';
    
    GET DIAGNOSTICS _locked_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'locked_count', _locked_count,
        'billing_month', _billing_month
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lock_month_for_billing(UUID, DATE) FROM anon;

-- 4. Harden log_admin_action()
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_action TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB) FROM anon;
