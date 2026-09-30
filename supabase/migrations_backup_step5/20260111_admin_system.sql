-- Admin System Database Schema
-- Run this migration to set up all admin tables and security policies

-- ============================================
-- 1. ADD ROLE COLUMN TO PROFILES
-- ============================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES profiles(id);

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- 2. CREATE ADMIN HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role = 'admin' 
    AND is_blocked = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. PRODUCTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'L',
  is_available BOOLEAN DEFAULT true,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Anyone can view available products"
  ON products FOR SELECT
  USING (is_available = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- 4. SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  daily_quantity DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  paused_by_admin BOOLEAN DEFAULT false,
  paused_at TIMESTAMP,
  paused_by UUID REFERENCES profiles(id),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product ON subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can create own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all subscriptions"
  ON subscriptions FOR ALL
  USING (is_admin(auth.uid()));

-- ============================================
-- 5. DAILY DELIVERIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS daily_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  quantity DECIMAL(10,2) NOT NULL,
  delivery_date DATE NOT NULL,
  status TEXT DEFAULT 'scheduled',
  delivery_boy_id UUID REFERENCES profiles(id),
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES profiles(id),
  delivered_at TIMESTAMP,
  notes TEXT,
  area TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_deliveries_date ON daily_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_daily_deliveries_status ON daily_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_daily_deliveries_boy ON daily_deliveries(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_daily_deliveries_user ON daily_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_deliveries_area ON daily_deliveries(area);

-- Enable RLS
ALTER TABLE daily_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own deliveries"
  ON daily_deliveries FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = delivery_boy_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all deliveries"
  ON daily_deliveries FOR ALL
  USING (is_admin(auth.uid()));

-- ============================================
-- 6. ADMIN LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);

-- Enable RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Only admins can view logs"
  ON admin_logs FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can insert logs"
  ON admin_logs FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 7. WALLET TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS wallet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own wallet"
  ON wallet FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all wallets"
  ON wallet FOR ALL
  USING (is_admin(auth.uid()));

-- ============================================
-- 8. WALLET TRANSACTIONS TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  source TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  reference_id TEXT,
  description TEXT,
  admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at);

-- Enable RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all transactions"
  ON wallet_transactions FOR ALL
  USING (is_admin(auth.uid()));

-- ============================================
-- 9. CREATE ADMIN LOG FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. UPDATE TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to wallet
DROP TRIGGER IF EXISTS update_wallet_updated_at ON wallet;
CREATE TRIGGER update_wallet_updated_at
  BEFORE UPDATE ON wallet
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- To make a user an admin, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
