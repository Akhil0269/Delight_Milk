-- =====================================================
-- AUTOMATIC DELIVERY CONFIRMATION & CALENDAR MARKING SYSTEM
-- =====================================================
-- This migration implements a tamper-proof, real-time delivery 
-- confirmation system with automatic calendar updates
-- =====================================================

-- 1. CREATE DELIVERY AUDIT LOG TABLE
-- Tracks all delivery status changes for transparency and security
CREATE TABLE IF NOT EXISTS public.delivery_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    changed_by UUID REFERENCES auth.users(id) NOT NULL,
    old_status delivery_status,
    new_status delivery_status NOT NULL,
    change_reason TEXT,
    is_admin_correction BOOLEAN DEFAULT false,
    billing_month_locked BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. ADD NEW COLUMNS TO DELIVERIES TABLE
-- Add columns for tracking delivery confirmation details
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS marked_delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS marked_delivered_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS delivery_partner_name TEXT,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_reason TEXT,
ADD COLUMN IF NOT EXISTS offline_marked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

-- 3. CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_deliveries_date_user ON public.deliveries(delivery_date, user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_marked_by ON public.deliveries(marked_delivered_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_delivery ON public.delivery_audit_log(delivery_id);

-- 4. FUNCTION: CHECK IF MONTH IS LOCKED FOR BILLING
CREATE OR REPLACE FUNCTION public.is_month_locked_for_billing(
    _user_id UUID,
    _delivery_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _billing_month DATE;
    _receipt_exists BOOLEAN;
BEGIN
    -- Get the first day of the delivery month
    _billing_month := date_trunc('month', _delivery_date)::DATE;
    
    -- Check if a receipt exists for this month
    SELECT EXISTS (
        SELECT 1 
        FROM public.receipts 
        WHERE user_id = _user_id 
        AND billing_month = _billing_month
        AND status IN ('paid', 'processing')
    ) INTO _receipt_exists;
    
    RETURN _receipt_exists;
END;
$$;

-- 5. FUNCTION: MARK DELIVERY AS DELIVERED (ONE-CLICK CONFIRMATION)
CREATE OR REPLACE FUNCTION public.mark_delivery_delivered(
    _delivery_id UUID,
    _marked_by UUID,
    _delivery_proof_url TEXT DEFAULT NULL,
    _notes TEXT DEFAULT NULL,
    _offline_marked BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _delivery RECORD;
    _current_user_role app_role;
    _is_locked BOOLEAN;
    _result JSONB;
BEGIN
    -- Get delivery details
    SELECT * INTO _delivery
    FROM public.deliveries
    WHERE id = _delivery_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Delivery not found'
        );
    END IF;
    
    -- Check if delivery is already marked as delivered
    IF _delivery.status = 'delivered' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Delivery already marked as delivered'
        );
    END IF;
    
    -- Check if month is locked for billing
    SELECT public.is_month_locked_for_billing(_delivery.user_id, _delivery.delivery_date)
    INTO _is_locked;
    
    IF _is_locked THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot modify delivery - month is locked for billing'
        );
    END IF;
    
    -- Check if delivery is locked
    IF _delivery.is_locked THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Delivery is locked and cannot be modified'
        );
    END IF;
    
    -- Verify user has permission (admin or delivery_partner)
    SELECT role INTO _current_user_role
    FROM public.user_roles
    WHERE user_id = _marked_by
    AND role IN ('admin', 'delivery_partner')
    LIMIT 1;
    
    IF _current_user_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized - only admin or delivery partner can mark deliveries'
        );
    END IF;
    
    -- Check if marking is allowed only on delivery day (can be disabled for admin)
    IF _current_user_role != 'admin' AND _delivery.delivery_date != CURRENT_DATE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Deliveries can only be marked on the delivery day'
        );
    END IF;
    
    -- Update delivery status
    UPDATE public.deliveries
    SET 
        status = 'delivered',
        delivery_time = COALESCE(delivery_time, now()),
        marked_delivered_at = now(),
        marked_delivered_by = _marked_by,
        delivered_by = _marked_by,
        delivery_proof_url = COALESCE(_delivery_proof_url, delivery_proof_url),
        notes = COALESCE(_notes, notes),
        offline_marked = _offline_marked,
        synced_at = CASE WHEN _offline_marked THEN now() ELSE synced_at END,
        updated_at = now()
    WHERE id = _delivery_id;
    
    -- Log the change in audit table
    INSERT INTO public.delivery_audit_log (
        delivery_id,
        user_id,
        changed_by,
        old_status,
        new_status,
        change_reason,
        is_admin_correction,
        metadata
    ) VALUES (
        _delivery_id,
        _delivery.user_id,
        _marked_by,
        _delivery.status,
        'delivered',
        'Delivery confirmed',
        false,
        jsonb_build_object(
            'offline_marked', _offline_marked,
            'delivery_time', now(),
            'marked_by_role', _current_user_role
        )
    );
    
    -- Return success with delivery details
    SELECT jsonb_build_object(
        'success', true,
        'delivery_id', _delivery_id,
        'user_id', _delivery.user_id,
        'delivery_date', _delivery.delivery_date,
        'status', 'delivered',
        'marked_at', now(),
        'marked_by', _marked_by
    ) INTO _result;
    
    RETURN _result;
END;
$$;

-- 6. FUNCTION: ADMIN CORRECTION WITH AUDIT TRAIL
CREATE OR REPLACE FUNCTION public.admin_correct_delivery(
    _delivery_id UUID,
    _admin_id UUID,
    _new_status delivery_status,
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
    _result JSONB;
BEGIN
    -- Verify admin role
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _admin_id AND role = 'admin'
    ) INTO _is_admin;
    
    IF NOT _is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized - admin access required'
        );
    END IF;
    
    -- Get delivery details
    SELECT * INTO _delivery
    FROM public.deliveries
    WHERE id = _delivery_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Delivery not found'
        );
    END IF;
    
    -- Check if month is locked for billing
    SELECT public.is_month_locked_for_billing(_delivery.user_id, _delivery.delivery_date)
    INTO _is_locked;
    
    IF _is_locked THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot modify delivery - month is locked for billing. Contact system administrator.'
        );
    END IF;
    
    -- Require correction reason
    IF _correction_reason IS NULL OR trim(_correction_reason) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Correction reason is required'
        );
    END IF;
    
    -- Update delivery status
    UPDATE public.deliveries
    SET 
        status = _new_status,
        updated_at = now()
    WHERE id = _delivery_id;
    
    -- Log the correction in audit table
    INSERT INTO public.delivery_audit_log (
        delivery_id,
        user_id,
        changed_by,
        old_status,
        new_status,
        change_reason,
        is_admin_correction,
        metadata
    ) VALUES (
        _delivery_id,
        _delivery.user_id,
        _admin_id,
        _delivery.status,
        _new_status,
        _correction_reason,
        true,
        jsonb_build_object(
            'corrected_at', now(),
            'original_status', _delivery.status
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'delivery_id', _delivery_id,
        'old_status', _delivery.status,
        'new_status', _new_status,
        'corrected_by', _admin_id,
        'reason', _correction_reason
    );
END;
$$;

-- 7. FUNCTION: LOCK MONTH AFTER BILLING
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
    -- Lock all deliveries for the month
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

-- 8. TRIGGER: NOTIFY ON DELIVERY STATUS CHANGE (Real-time sync)
CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Send real-time notification when delivery status changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM pg_notify(
            'delivery_status_changed',
            json_build_object(
                'delivery_id', NEW.id,
                'user_id', NEW.user_id,
                'delivery_date', NEW.delivery_date,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'marked_at', NEW.marked_delivered_at,
                'marked_by', NEW.marked_delivered_by,
                'timestamp', now()
            )::text
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for real-time notifications
DROP TRIGGER IF EXISTS trigger_notify_delivery_status_change ON public.deliveries;
CREATE TRIGGER trigger_notify_delivery_status_change
    AFTER UPDATE ON public.deliveries
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION public.notify_delivery_status_change();

-- 9. RLS POLICIES FOR AUDIT LOG
ALTER TABLE public.delivery_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own delivery audit logs"
    ON public.delivery_audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
    ON public.delivery_audit_log FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only system can insert audit logs"
    ON public.delivery_audit_log FOR INSERT
    WITH CHECK (false); -- Only functions can insert

-- 10. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.delivery_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_delivery_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_correct_delivery TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_month_locked_for_billing TO authenticated;

-- 11. COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE public.delivery_audit_log IS 'Audit trail for all delivery status changes';
COMMENT ON FUNCTION public.mark_delivery_delivered IS 'One-click delivery confirmation with automatic calendar update';
COMMENT ON FUNCTION public.admin_correct_delivery IS 'Admin correction with mandatory reason and audit trail';
COMMENT ON FUNCTION public.is_month_locked_for_billing IS 'Check if a month is locked for billing';
COMMENT ON FUNCTION public.lock_month_for_billing IS 'Lock all deliveries for a month after billing';
