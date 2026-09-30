# 🗄️ SUPABASE DATABASE SETUP - Complete Guide

## 📋 **Complete Supabase Setup for Production**

If you want to use a **real database** instead of localStorage, follow this guide.

---

## ⚠️ **IMPORTANT: Two Modes**

### **Development Mode (Current - No Database)**
- ✅ Works offline
- ✅ Uses localStorage
- ✅ No setup needed
- ✅ Perfect for testing
- ❌ Data lost when clearing browser

### **Production Mode (Real Database)**
- ✅ Real database
- ✅ Data persists
- ✅ Multi-device sync
- ❌ Requires Supabase setup
- ❌ Needs internet

---

## 🚀 **OPTION 1: Keep Development Mode (Recommended)**

**Just click "Sign up" on the admin login page!**

See `ADMIN_QUICK_START.md` for details.

---

## 🗄️ **OPTION 2: Set Up Real Supabase Database**

### **Prerequisites:**
- Supabase account
- Internet connection
- 15-20 minutes

---

## 📝 **Step-by-Step Supabase Setup**

### **PART 1: Get Supabase Credentials**

#### **Step 1: Go to Supabase Dashboard**
```
https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid
```

#### **Step 2: Get Your API Key**
1. Click on "Settings" (gear icon)
2. Click on "API"
3. Find "Project API keys"
4. Copy the **"anon public"** key (NOT service_role!)

#### **Step 3: Update .env File**

Open: `c:\Users\pesal\Downloads\Delight-milk-app-main\Delight-milk-app-main\.env`

Change:
```env
# FROM:
VITE_DEV_MODE=true
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZnF0a3VnemF5ZnBxaWx1ZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzU3MjIsImV4cCI6MjA1MjI1MTcyMn0.placeholder-replace-with-real-key

# TO:
VITE_DEV_MODE=false
VITE_SUPABASE_PUBLISHABLE_KEY=your-real-anon-public-key-here
```

---

### **PART 2: Create Database Tables**

#### **Step 1: Open SQL Editor**
1. Go to Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New query"

#### **Step 2: Run This SQL**

Copy and paste this entire SQL script:

```sql
-- ============================================
-- DELIGHT MILK APP - DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (User Information)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  unit TEXT,
  price_regular DECIMAL(10,2),
  price_subscription DECIMAL(10,2),
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Products Policies
CREATE POLICY "Anyone can view available products"
  ON products FOR SELECT
  USING (is_available = TRUE);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'yaswanthvenkata245@gmail.com'
    )
  );

-- ============================================
-- 3. DAILY DELIVERIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  delivery_date DATE NOT NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'scheduled', -- scheduled, out_for_delivery, delivered, missed
  delivery_boy_id UUID REFERENCES profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID REFERENCES auth.users(id),
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE daily_deliveries ENABLE ROW LEVEL SECURITY;

-- Deliveries Policies
CREATE POLICY "Users can view own deliveries"
  ON daily_deliveries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all deliveries"
  ON daily_deliveries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'yaswanthvenkata245@gmail.com'
    )
  );

-- ============================================
-- 4. WALLET TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wallet (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;

-- Wallet Policies
CREATE POLICY "Users can view own wallet"
  ON wallet FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallet FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. WALLET TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL, -- credit, debit
  source TEXT, -- payment_gateway, admin_credit, order_payment, refund
  description TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Transactions Policies
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 6. ADMIN LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT, -- user, product, delivery, wallet
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Admin Logs Policies
CREATE POLICY "Admins can view all logs"
  ON admin_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'yaswanthvenkata245@gmail.com'
    )
  );

CREATE POLICY "Admins can insert logs"
  ON admin_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'yaswanthvenkata245@gmail.com'
    )
  );

-- ============================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Create wallet for new user
  INSERT INTO public.wallet (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON daily_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_updated_at
  BEFORE UPDATE ON wallet
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_deliveries_user_date ON daily_deliveries(user_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON daily_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
```

#### **Step 3: Click "Run"**

Wait for the success message: "Success. No rows returned"

---

### **PART 3: Insert Sample Data (Optional)**

```sql
-- Insert sample products
INSERT INTO products (product_name, category, unit, price_regular, price_subscription, is_available) VALUES
('Full Cream Milk', 'milk', '500ml', 30.00, 28.00, TRUE),
('Toned Milk', 'milk', '500ml', 25.00, 23.00, TRUE),
('Fresh Curd', 'curd', '500g', 35.00, 32.00, TRUE),
('Pure Ghee', 'ghee', '500ml', 450.00, 420.00, TRUE),
('Paneer', 'dairy', '200g', 80.00, 75.00, TRUE);
```

---

### **PART 4: Enable Phone Authentication (Optional)**

If you want phone OTP to work:

1. Go to **Authentication → Providers**
2. Enable **Phone** provider
3. Choose SMS provider (Twilio recommended)
4. Add your Twilio credentials

---

### **PART 5: Restart Your App**

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

---

## ✅ **Verification**

After setup, test:

1. **Sign up** with email
2. Check Supabase Dashboard → Table Editor → profiles
3. You should see your user!

---

## 🎯 **Summary**

### **Development Mode (Current):**
- ✅ No database setup
- ✅ Works offline
- ✅ Just click "Sign up"

### **Production Mode (After Setup):**
- ✅ Real database
- ✅ Data persists
- ✅ Multi-device sync

---

## 📞 **Need Help?**

For now, I recommend:
1. **Keep development mode**
2. **Click "Sign up" on admin login**
3. **Test everything**
4. **Set up Supabase later when ready for production**

---

**🚀 Quick Start: Just click "Sign up" on the admin login page!**
