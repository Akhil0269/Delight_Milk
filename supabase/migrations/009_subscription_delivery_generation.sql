-- =====================================================
-- 009_subscription_delivery_generation.sql
-- Delight Milk: Subscription → Delivery Generation Engine (Phase 6)
-- Additive Only - Safe, Transactional & Idempotent
-- =====================================================

-- 1. Ensure Partial Unique Index on Subscriptions Delivery Schedule
-- Guarantees at the database level that no subscription can ever generate
-- more than one delivery record on any given calendar date.
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_subscription_date_unique
    ON public.deliveries (subscription_id, delivery_date)
    WHERE subscription_id IS NOT NULL;

-- 2. Drop existing function if signature or parameter name changed
DROP FUNCTION IF EXISTS public.generate_subscription_deliveries(DATE);

-- 3. Subscription Delivery Generation Engine
-- Function: generate_subscription_deliveries(DATE)
--
-- Security: SECURITY DEFINER with fixed search_path = public, pg_temp.
-- Access: Admin or Service Role (cron / background worker) only. Regular customers are rejected.
-- Behavior:
--   - Validates input target_date.
--   - Selects active subscriptions (is_active = true, quantity > 0).
--   - Excludes paused subscriptions (paused_by_admin = true or paused_until >= target_date).
--   - Excludes subscriptions outside date window (start_date > target_date or end_date < target_date).
--   - Excludes blocked customer accounts and inactive products.
--   - Resolves canonical subscription price via public.get_price_for_date().
--   - Inserts delivery rows with delivery_type = 'subscription' and status = 'upcoming'.
--   - Idempotent: duplicate runs on the same target_date result in zero extra deliveries.
--   - Returns detailed execution metrics in JSONB.
CREATE OR REPLACE FUNCTION public.generate_subscription_deliveries(
    target_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_active INTEGER := 0;
    v_eligible_count INTEGER := 0;
    v_already_existing_count INTEGER := 0;
    v_generated_count INTEGER := 0;
    v_skipped_paused INTEGER := 0;
    v_skipped_date_range INTEGER := 0;
    v_skipped_blocked_user INTEGER := 0;
    v_skipped_inactive_product INTEGER := 0;
    v_generated_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- 1. Security Authorization Guard
    -- Allow service-role (auth.uid() IS NULL in background cron/Edge Function)
    -- or authenticated users who hold the 'admin' role.
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Admin or service-role privileges required'
        );
    END IF;

    -- 2. Target Date Validation
    IF target_date IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Target date is required'
        );
    END IF;

    -- 3. Compute Breakdown Statistics for Observability
    -- Total active subscriptions
    SELECT count(*) INTO v_total_active
    FROM public.subscriptions
    WHERE is_active = true;

    -- Skipped: Paused (by admin or paused_until >= target_date)
    SELECT count(*) INTO v_skipped_paused
    FROM public.subscriptions
    WHERE is_active = true
      AND (
          COALESCE(paused_by_admin, false) = true
          OR (paused_until IS NOT NULL AND paused_until >= target_date)
      );

    -- Skipped: Outside effective date window
    SELECT count(*) INTO v_skipped_date_range
    FROM public.subscriptions
    WHERE is_active = true
      AND (
          (start_date IS NOT NULL AND start_date > target_date)
          OR (end_date IS NOT NULL AND end_date < target_date)
      )
      AND NOT (
          COALESCE(paused_by_admin, false) = true
          OR (paused_until IS NOT NULL AND paused_until >= target_date)
      );

    -- Skipped: Customer profile is blocked
    SELECT count(*) INTO v_skipped_blocked_user
    FROM public.subscriptions s
    JOIN public.profiles prof ON prof.user_id = s.user_id
    WHERE s.is_active = true
      AND prof.is_blocked = true
      AND NOT (
          COALESCE(s.paused_by_admin, false) = true
          OR (s.paused_until IS NOT NULL AND s.paused_until >= target_date)
          OR (s.start_date IS NOT NULL AND s.start_date > target_date)
          OR (s.end_date IS NOT NULL AND s.end_date < target_date)
      );

    -- Skipped: Product is inactive or subscription disabled
    SELECT count(*) INTO v_skipped_inactive_product
    FROM public.subscriptions s
    JOIN public.products p ON p.id = s.product_id
    WHERE s.is_active = true
      AND (p.is_active = false OR COALESCE(p.subscription_enabled, true) = false)
      AND NOT (
          COALESCE(s.paused_by_admin, false) = true
          OR (s.paused_until IS NOT NULL AND s.paused_until >= target_date)
          OR (s.start_date IS NOT NULL AND s.start_date > target_date)
          OR (s.end_date IS NOT NULL AND s.end_date < target_date)
      );

    -- 4. Count Total Eligible Subscriptions on Target Date
    SELECT count(*) INTO v_eligible_count
    FROM public.subscriptions s
    JOIN public.products p ON p.id = s.product_id
    LEFT JOIN public.profiles prof ON prof.user_id = s.user_id
    WHERE s.is_active = true
      AND s.quantity > 0
      AND COALESCE(s.paused_by_admin, false) = false
      AND (s.paused_until IS NULL OR s.paused_until < target_date)
      AND (s.start_date IS NULL OR s.start_date <= target_date)
      AND (s.end_date IS NULL OR s.end_date >= target_date)
      AND COALESCE(prof.is_blocked, false) = false
      AND p.is_active = true
      AND COALESCE(p.subscription_enabled, true) = true;

    -- 5. Atomic Idempotent Insert with Price Resolution
    WITH eligible_subs AS (
        SELECT 
            s.user_id,
            s.id AS subscription_id,
            s.product_id,
            target_date AS delivery_date,
            s.quantity,
            COALESCE(
                NULLIF(public.get_price_for_date(s.product_id, target_date, true), 0),
                p.price_per_unit,
                0
            ) AS price_per_unit,
            'upcoming'::public.delivery_status AS status,
            'subscription'::text AS delivery_type,
            'Recurring subscription delivery'::text AS notes
        FROM public.subscriptions s
        JOIN public.products p ON p.id = s.product_id
        LEFT JOIN public.profiles prof ON prof.user_id = s.user_id
        WHERE s.is_active = true
          AND s.quantity > 0
          AND COALESCE(s.paused_by_admin, false) = false
          AND (s.paused_until IS NULL OR s.paused_until < target_date)
          AND (s.start_date IS NULL OR s.start_date <= target_date)
          AND (s.end_date IS NULL OR s.end_date >= target_date)
          AND COALESCE(prof.is_blocked, false) = false
          AND p.is_active = true
          AND COALESCE(p.subscription_enabled, true) = true
    ),
    inserted_rows AS (
        INSERT INTO public.deliveries (
            user_id,
            subscription_id,
            product_id,
            delivery_date,
            quantity,
            price_per_unit,
            status,
            delivery_type,
            notes
        )
        SELECT 
            user_id,
            subscription_id,
            product_id,
            delivery_date,
            quantity,
            price_per_unit,
            status,
            delivery_type,
            notes
        FROM eligible_subs
        ON CONFLICT (user_id, subscription_id, delivery_date) DO NOTHING
        RETURNING id
    )
    SELECT 
        COALESCE(count(*), 0),
        COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO v_generated_count, v_generated_ids
    FROM inserted_rows;

    -- Compute already existing deliveries among eligible subscriptions
    v_already_existing_count := GREATEST(0, v_eligible_count - v_generated_count);

    -- 6. Return Detailed Execution Metrics
    RETURN jsonb_build_object(
        'success', true,
        'target_date', target_date,
        'total_active_subscriptions', v_total_active,
        'eligible_subscriptions', v_eligible_count,
        'deliveries_generated', v_generated_count,
        'deliveries_already_existing', v_already_existing_count,
        'skipped_paused_count', v_skipped_paused,
        'skipped_date_range_count', v_skipped_date_range,
        'skipped_blocked_user_count', v_skipped_blocked_user,
        'skipped_inactive_product_count', v_skipped_inactive_product,
        'generated_delivery_ids', v_generated_ids,
        'executed_at', now()
    );
END;
$$;

-- 4. Comments & Permissions
COMMENT ON FUNCTION public.generate_subscription_deliveries(DATE) IS
'Generates canonical deliveries in public.deliveries for all eligible active subscriptions on a target date. Idempotent and concurrency-safe.';

REVOKE EXECUTE ON FUNCTION public.generate_subscription_deliveries(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_subscription_deliveries(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_subscription_deliveries(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_subscription_deliveries(DATE) TO postgres;
