-- =====================================================
-- 015_admin_subscription_view.sql
-- Delight Milk: Admin Subscription Management Support (Phase 12.5)
-- Additive Only - Safe, Idempotent
-- =====================================================
-- Adds a convenience FK from public.subscriptions.user_id → public.profiles.user_id
-- so PostgREST can resolve the join for admin subscription queries.
-- This is additive and does not affect existing RLS, triggers, or customer functionality.
-- =====================================================

-- 1. Ensure profiles.user_id has a unique constraint (required for FK target)
--    profiles.user_id should already be unique (it's referenced from auth.users).
--    Add a UNIQUE constraint if not already present.
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

-- 2. Drop the existing FK from subscriptions.user_id → auth.users if it exists,
--    and recreate it as a dual reference:
--    Keep auth.users reference (for auth integrity) and add profiles reference.
--    Actually we cannot have two FKs on same column easily.
--    Instead, add a SEPARATE FK subscriptions.user_id → profiles.user_id.
--    PostgreSQL supports multiple FKs on the same column referencing different tables.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.subscriptions'::regclass
          AND conname = 'subscriptions_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.subscriptions
            ADD CONSTRAINT subscriptions_user_id_profiles_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.profiles(user_id)
            ON DELETE CASCADE
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

COMMENT ON CONSTRAINT subscriptions_user_id_profiles_fkey ON public.subscriptions IS
'Additional FK from subscriptions.user_id → profiles.user_id to enable PostgREST joins for admin queries.';
