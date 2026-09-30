-- =====================================================
-- 010_subscription_delivery_scheduler.sql
-- Delight Milk: Automatic Subscription Delivery Scheduler (Phase 7)
-- Additive Only - Safe, Transactional & Idempotent
-- =====================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Define Invocation Function
-- Invokes the GenerateDeliveries Supabase Edge Function via pg_net.
-- Configurable via PostgreSQL settings for seamless transition between local & production:
--   app.settings.edge_function_url
--   app.settings.service_role_key
CREATE OR REPLACE FUNCTION public.invoke_generate_subscription_deliveries()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_url TEXT;
    v_auth_header TEXT;
    v_req_id BIGINT;
BEGIN
    -- Determine target Edge Function endpoint
    -- Defaults to local Docker Kong gateway if not configured
    v_url := COALESCE(
        NULLIF(current_setting('app.settings.edge_function_url', true), ''),
        'http://kong:8000/functions/v1/GenerateDeliveries'
    );

    -- Determine service-role authorization key
    -- Defaults to standard local development key if not configured
    v_auth_header := COALESCE(
        NULLIF(current_setting('app.settings.service_role_key', true), ''),
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    );

    -- Invoke Edge Function asynchronously via pg_net if available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        SELECT net.http_post(
            url := v_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_auth_header
            ),
            body := '{}'::jsonb
        ) INTO v_req_id;

        RETURN jsonb_build_object(
            'success', true,
            'mechanism', 'edge_function_via_pg_net',
            'request_id', v_req_id,
            'target_url', v_url
        );
    ELSE
        -- Fallback to direct DB function if pg_net is not installed
        RETURN public.generate_subscription_deliveries(
            (timezone('Asia/Kolkata', now())::date + 1)
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION public.invoke_generate_subscription_deliveries() IS
'Invokes the GenerateDeliveries Edge Function via pg_net to generate subscription deliveries for tomorrow (Asia/Kolkata).';

REVOKE EXECUTE ON FUNCTION public.invoke_generate_subscription_deliveries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_generate_subscription_deliveries() TO service_role;
GRANT EXECUTE ON FUNCTION public.invoke_generate_subscription_deliveries() TO postgres;

-- 3. Register Daily Cron Schedule
-- Runs daily at 18:30 UTC, which corresponds to 00:00:00 (midnight) in India (Asia/Kolkata, UTC+5:30).
DO $$
BEGIN
    -- Unschedule existing job if previously registered
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-subscription-delivery-generation') THEN
        PERFORM cron.unschedule('daily-subscription-delivery-generation');
    END IF;

    -- Schedule daily midnight job
    PERFORM cron.schedule(
        'daily-subscription-delivery-generation',
        '30 18 * * *',
        'SELECT public.invoke_generate_subscription_deliveries();'
    );
END
$$;
