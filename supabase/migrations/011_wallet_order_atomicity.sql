-- =====================================================
-- 011_wallet_order_atomicity.sql
-- Delight Milk: Wallet Atomicity, Safe Refund & Performance Hardening (Phase 9)
-- Additive Only - Safe, Transactional, Idempotent
-- =====================================================

-- -----------------------------------------------------
-- 1. Atomic Wallet Order Creation Function
-- -----------------------------------------------------
-- Ensures that wallet deduction, order creation, order-items sync,
-- and payment status are executed within a single ACID transaction.
-- Locks the wallet row with FOR UPDATE to prevent race conditions or overdrafts.
-- Price is retrieved exclusively from canonical products catalog.
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
BEGIN
    -- 1. Security & Authentication Guard
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Authentication required'
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
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet not found for customer account'
        );
    END IF;

    IF v_current_balance < v_total_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient wallet balance. Required: ₹' || to_char(v_total_amount, 'FM999990.00') || ', Available: ₹' || to_char(v_current_balance, 'FM999990.00')
        );
    END IF;

    -- 6. Atomic Debit from Wallet
    UPDATE public.wallets
    SET balance = balance - v_total_amount,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- 7. Insert Order (trigger_sync_order_items automatically generates line item)
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

    -- 8. Record Debit Transaction in History
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        amount,
        type,
        description,
        reference_id,
        source,
        status
    ) VALUES (
        v_wallet_id,
        v_user_id,
        v_total_amount,
        'debit',
        'Payment for order #' || substr(v_order_id::text, 1, 8) || ' — ' || v_product_name,
        v_order_id::text,
        'wallet',
        'completed'
    );

    -- 9. Return Structured Result
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'total_amount', v_total_amount,
        'remaining_balance', v_current_balance - v_total_amount
    );
END;
$$;

COMMENT ON FUNCTION public.create_wallet_order(UUID, NUMERIC, DATE, TEXT, TEXT) IS
'Atomically validates balance, debits wallet, creates order, syncs items, and records transaction in one transaction.';

REVOKE EXECUTE ON FUNCTION public.create_wallet_order(UUID, NUMERIC, DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_wallet_order(UUID, NUMERIC, DATE, TEXT, TEXT) TO authenticated, service_role, postgres;

-- -----------------------------------------------------
-- 2. Atomic Order Cancellation & Refund Function
-- -----------------------------------------------------
-- Ensures that order cancellation, status transition, and wallet refund
-- occur atomically with strict double-refund guards.
CREATE OR REPLACE FUNCTION public.cancel_order_with_refund(
    p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_order RECORD;
    v_wallet_id UUID;
    v_current_balance NUMERIC;
    v_refund_amount NUMERIC;
    v_already_refunded BOOLEAN := false;
BEGIN
    -- 1. Security & Authentication Guard
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Authentication required'
        );
    END IF;

    -- 2. Lock Order Row FOR UPDATE
    SELECT id, user_id, total_amount, quantity, price_per_unit, payment_method, payment_status, status
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 3. Verify Ownership or Admin Role
    IF v_order.user_id <> v_user_id AND NOT public.has_role(v_user_id, 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Cannot cancel another customer order');
    END IF;

    -- 4. Idempotency Check: Already cancelled orders do NOT refund twice
    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', p_order_id,
            'status', 'cancelled',
            'payment_status', v_order.payment_status,
            'already_cancelled', true,
            'message', 'Order is already cancelled'
        );
    END IF;

    -- 5. Status Validation: Only confirmed orders can be cancelled by customer
    IF v_order.status <> 'confirmed' AND NOT public.has_role(v_user_id, 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot cancel order with status ''' || v_order.status || '''. Only confirmed orders can be cancelled.'
        );
    END IF;

    -- 6. Handle Wallet Refund if Paid
    IF v_order.payment_method = 'wallet' AND v_order.payment_status = 'paid' THEN
        v_refund_amount := COALESCE(v_order.total_amount, v_order.quantity * v_order.price_per_unit);

        -- Double refund check in transaction history
        SELECT EXISTS(
            SELECT 1 FROM public.wallet_transactions
            WHERE reference_id = p_order_id::text AND type = 'credit'
        ) INTO v_already_refunded;

        IF NOT v_already_refunded THEN
            -- Lock wallet row
            SELECT id, balance INTO v_wallet_id, v_current_balance
            FROM public.wallets
            WHERE user_id = v_order.user_id
            FOR UPDATE;

            IF v_wallet_id IS NOT NULL THEN
                -- Refund balance
                UPDATE public.wallets
                SET balance = balance + v_refund_amount,
                    updated_at = now()
                WHERE id = v_wallet_id;

                -- Log credit transaction
                INSERT INTO public.wallet_transactions (
                    wallet_id,
                    user_id,
                    amount,
                    type,
                    description,
                    reference_id,
                    source,
                    status
                ) VALUES (
                    v_wallet_id,
                    v_order.user_id,
                    v_refund_amount,
                    'credit',
                    'Refund for cancelled order #' || substr(p_order_id::text, 1, 8),
                    p_order_id::text,
                    'wallet',
                    'completed'
                );
            END IF;
        END IF;

        -- Update order status and payment_status
        UPDATE public.orders
        SET status = 'cancelled',
            payment_status = 'refunded',
            updated_at = now()
        WHERE id = p_order_id;
    ELSE
        -- Non-wallet order cancellation
        UPDATE public.orders
        SET status = 'cancelled',
            updated_at = now()
        WHERE id = p_order_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', 'cancelled',
        'payment_status', CASE WHEN v_order.payment_method = 'wallet' AND v_order.payment_status = 'paid' THEN 'refunded' ELSE v_order.payment_status END,
        'refund_amount', COALESCE(v_refund_amount, 0)
    );
END;
$$;

COMMENT ON FUNCTION public.cancel_order_with_refund(UUID) IS
'Atomically cancels confirmed order, refunds wallet balance if paid, and prevents duplicate refunds.';

REVOKE EXECUTE ON FUNCTION public.cancel_order_with_refund(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_refund(UUID) TO authenticated, service_role, postgres;

-- -----------------------------------------------------
-- 3. Production Query Performance Indexes
-- -----------------------------------------------------

-- Wallet transactions: user history lookup (useWalletTransactions)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_date
    ON public.wallet_transactions (user_id, created_at DESC);

-- Wallet transactions: FK lookup on wallet_id
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id
    ON public.wallet_transactions (wallet_id);

-- Wallet transactions: lookup by order/refund reference_id
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_ref_id
    ON public.wallet_transactions (reference_id);

-- Orders: customer order history (useOrders)
CREATE INDEX IF NOT EXISTS idx_orders_user_created
    ON public.orders (user_id, created_at DESC);

-- Orders: latest delivered order lookup (useLatestDeliveredOrder)
CREATE INDEX IF NOT EXISTS idx_orders_user_status_date
    ON public.orders (user_id, status, delivery_date DESC);

-- Deliveries: customer delivery calendar (useDeliveries)
CREATE INDEX IF NOT EXISTS idx_deliveries_user_date
    ON public.deliveries (user_id, delivery_date DESC);

-- Subscriptions: customer active subscriptions (useSubscriptions)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
    ON public.subscriptions (user_id, is_active);

-- -----------------------------------------------------
-- 4. Delivery Update Security Hardening
-- -----------------------------------------------------
-- Guarantees that customers cannot assign delivery boys, change delivery partner names,
-- mark deliveries as delivered/missed, or tamper with pricing/delivery type.
CREATE OR REPLACE FUNCTION public.check_delivery_update_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Allow service-role, admin, or assigned delivery partner full update capability
    IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'delivery_partner') THEN
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
$$;

DROP TRIGGER IF EXISTS trg_protect_delivery_updates ON public.deliveries;
CREATE TRIGGER trg_protect_delivery_updates
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.check_delivery_update_security();

