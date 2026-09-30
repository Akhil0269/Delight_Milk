-- =====================================================
-- 007_admin_system_compatibility.sql
-- Delight Milk: Admin System, Audit Logs & Compatibility Layer
-- =====================================================

-- 1. Add User Account Restriction Fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_profiles_blocked ON public.profiles(is_blocked);

-- 2. Add Admin Management Fields to subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS paused_by_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paused_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 3. Add Ledger Fields to wallet_transactions
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'wallet',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id);

-- Auto-resolve wallet_id if omitted on insert
CREATE OR REPLACE FUNCTION public.resolve_wallet_transaction_wallet_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wallet_id IS NULL THEN
        SELECT id INTO NEW.wallet_id FROM public.wallets WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_resolve_wallet_id ON public.wallet_transactions;
CREATE TRIGGER trigger_resolve_wallet_id
    BEFORE INSERT ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION public.resolve_wallet_transaction_wallet_id();

-- 4. Create admin_logs Audit Table
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_logs;

CREATE POLICY "Admins can view logs"
ON public.admin_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs"
ON public.admin_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Helper Function: Log Admin Action
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
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Compatibility Helper Function: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT public.has_role(user_id, 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 7. Admin Promotion Helper: promote_user_to_admin()
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _user_id UUID;
BEGIN
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

-- 8. Compatibility Views (Fallback layer for legacy queries)
CREATE OR REPLACE VIEW public.wallet AS
SELECT id, user_id, balance, updated_at
FROM public.wallets;

CREATE OR REPLACE VIEW public.daily_deliveries AS
SELECT 
    d.id,
    d.user_id,
    d.product_id,
    d.subscription_id,
    d.quantity,
    d.delivery_date,
    d.status::text AS status,
    d.delivery_boy_id,
    d.assigned_at,
    d.assigned_by,
    d.delivery_time AS delivered_at,
    d.notes,
    d.area,
    d.created_at
FROM public.deliveries d;

-- 9. Realtime Publication Setup (Safe configuration)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
