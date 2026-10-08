-- Migration 014: Admin User Management & Suspension Hardening
-- 1. Protects profiles administrative columns (is_blocked, blocked_at, blocked_by) from client-side tampering
-- 2. Enforces database-level order blocking for suspended accounts
-- 3. Hardens create_wallet_order to reject suspended accounts

-- 1. Function and trigger to protect administrative columns in public.profiles
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If caller is an authenticated non-admin, strictly prevent modification of administrative fields
    IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
        IF (NEW.is_blocked IS DISTINCT FROM OLD.is_blocked) OR
           (NEW.blocked_at IS DISTINCT FROM OLD.blocked_at) OR
           (NEW.blocked_by IS DISTINCT FROM OLD.blocked_by) THEN
            RAISE EXCEPTION 'Only administrators can modify account suspension status or administrative fields.';
        END IF;

        IF (NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
            RAISE EXCEPTION 'User ID cannot be altered.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_admin_fields_trigger ON public.profiles;

CREATE TRIGGER protect_profile_admin_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_admin_fields();

-- 2. Update orders INSERT RLS policy to block suspended customers
DROP POLICY IF EXISTS "Customers can create their own orders" ON public.orders;

CREATE POLICY "Customers can create their own orders" 
ON public.orders
FOR INSERT 
TO authenticated 
WITH CHECK (
    (auth.uid() = user_id) 
    AND NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() 
          AND profiles.is_blocked = true
    )
);

-- 3. Update create_wallet_order RPC to enforce suspension guard
CREATE OR REPLACE FUNCTION public.create_wallet_order(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_delivery_date DATE,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_wallet_id UUID;
    v_current_balance NUMERIC;
    v_price_per_unit NUMERIC;
    v_product_name TEXT;
    v_is_active BOOLEAN;
    v_total_amount NUMERIC;
    v_order_id UUID;
    v_is_blocked BOOLEAN;
BEGIN
    -- 1. Security & Authentication Guard
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Authentication required'
        );
    END IF;

    -- 1b. Check if account is suspended
    SELECT is_blocked INTO v_is_blocked
    FROM public.profiles
    WHERE user_id = v_user_id;

    IF v_is_blocked = true THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Your account has been suspended. Please contact customer support.'
        );
    END IF;

    -- 2. Input Validation
    IF p_product_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product ID is required');
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantity must be greater than zero');
    END IF;

    IF p_delivery_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery date is required');
    END IF;

    IF p_delivery_date < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery date cannot be in the past');
    END IF;

    -- 3. Idempotency Check (if key provided)
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id, total_amount INTO v_order_id, v_total_amount
        FROM public.orders
        WHERE user_id = v_user_id AND notes LIKE '%' || p_idempotency_key || '%'
        LIMIT 1;

        IF v_order_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_order_id,
                'total_amount', v_total_amount,
                'idempotent_replay', true
            );
        END IF;
    END IF;

    -- 4. Fetch Canonical Product & Price (never trust client price)
    SELECT price_per_unit, name, is_active
    INTO v_price_per_unit, v_product_name, v_is_active
    FROM public.products
    WHERE id = p_product_id;

    IF v_price_per_unit IS NULL OR v_is_active = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Product not found or currently unavailable'
        );
    END IF;

    v_total_amount := p_quantity * v_price_per_unit;

    -- 5. Lock and Validate Customer Wallet (FOR UPDATE guarantees row lock)
    SELECT id, balance
    INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        -- Create wallet on-the-fly with 0 balance if missing
        INSERT INTO public.wallets (user_id, balance)
        VALUES (v_user_id, 0)
        RETURNING id, balance INTO v_wallet_id, v_current_balance;
    END IF;

    IF v_current_balance < v_total_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Insufficient wallet balance. Required: ₹%s, Available: ₹%s', v_total_amount, v_current_balance)
        );
    END IF;

    -- 6. Atomic Deduction from Wallet
    UPDATE public.wallets
    SET balance = balance - v_total_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    -- 7. Insert Order (trigger_sync_order_items and trigger_sync_delivery_from_order handle line items & delivery)
    INSERT INTO public.orders (
        user_id,
        product_id,
        quantity,
        price_per_unit,
        delivery_date,
        payment_method,
        payment_status,
        status,
        notes
    ) VALUES (
        v_user_id,
        p_product_id,
        p_quantity,
        v_price_per_unit,
        p_delivery_date,
        'wallet',
        'paid',
        'confirmed',
        p_notes
    ) RETURNING id INTO v_order_id;

    -- 8. Record Wallet Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        amount,
        type,
        status,
        description,
        reference_id,
        source
    ) VALUES (
        v_wallet_id,
        v_user_id,
        v_total_amount,
        'debit',
        'completed',
        format('Order payment for %s x %s (%s)', p_quantity, v_product_name, v_order_id),
        v_order_id::text,
        'wallet'
    );

    -- 11. Return Success Result with created order details
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'total_amount', v_total_amount,
        'remaining_balance', v_current_balance - v_total_amount
    );
END;
$$;
