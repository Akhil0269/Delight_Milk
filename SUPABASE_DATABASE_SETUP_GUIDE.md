# 🗄️ Supabase Database Setup Guide

## 📋 Overview

This guide will help you set up the complete Supabase database for the Delight Milk App. The app currently runs in **Development Mode** (offline with mock data), but you can set up a real Supabase database for production use.

---

## ✅ Current Status

**Development Mode is ACTIVE** ✅
- App works completely offline
- Uses localStorage for authentication
- Uses mock data for all features
- No database setup required for testing

---

## 🚀 Setting Up Production Supabase Database

### Step 1: Get Your Supabase API Key

1. **Go to your Supabase Project Dashboard:**
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid
   ```

2. **Navigate to Settings → API:**
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/settings/api
   ```

3. **Copy the "anon" "public" key:**
   - Look for **"Project API keys"** section
   - Copy the key under **"anon public"** (NOT the service_role key)
   - It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### Step 2: Update Environment Variables

1. **Open the `.env` file** in the project root

2. **Update the following:**
   ```env
   # Set to false for production
   VITE_DEV_MODE=false
   
   VITE_SUPABASE_URL=https://qrfqtkugzayfpqilueid.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-real-anon-key-here
   ```

3. **Save the file**

---

### Step 3: Run Database Migrations

You have **8 migration files** in the `supabase/migrations` folder. Run them in order:

#### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Link to your project:**
   ```bash
   supabase link --project-ref qrfqtkugzayfpqilueid
   ```

3. **Run migrations:**
   ```bash
   supabase db push
   ```

#### Option B: Manual SQL Execution

1. **Go to SQL Editor:**
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/sql/new
   ```

2. **Run each migration file in order:**
   - `20260111101716_ecc6ed7f-d37a-449d-a1dc-f88b7b8413f4.sql` (Core schema)
   - `003_create_products_table.sql`
   - `004_dual_pricing_system.sql`
   - `005_update_product_images.sql`
   - `006_notifications_system.sql`
   - `007_automatic_delivery_confirmation.sql`
   - `20260111_admin_system.sql`
   - `20260111_create_admin_user.sql`

3. **Copy and paste each file's content into the SQL Editor**

4. **Click "Run"** for each migration

---

### Step 4: Verify Database Tables

After running migrations, you should have these tables:

#### Core Tables:
- ✅ **profiles** - User profiles
- ✅ **user_roles** - User role management (admin, customer, delivery_partner)
- ✅ **products** - Product catalog
- ✅ **subscriptions** - User subscriptions
- ✅ **deliveries** - Delivery calendar
- ✅ **wallets** - User wallet balances
- ✅ **wallet_transactions** - Wallet transaction history
- ✅ **receipts** - Monthly receipts
- ✅ **receipt_items** - Receipt line items

#### Admin Tables:
- ✅ **admin_logs** - Admin action logs
- ✅ **notifications** - User notifications
- ✅ **delivery_confirmations** - Delivery confirmation records

---

### Step 5: Configure Authentication

#### Enable Email Authentication:

1. **Go to Authentication → Providers:**
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/auth/providers
   ```

2. **Enable "Email" provider**

3. **Optional: Disable email confirmation** for testing:
   - Go to **Authentication → Settings**
   - Turn off **"Enable email confirmations"**

#### Enable Phone Authentication (Optional):

1. **Go to Authentication → Providers**

2. **Enable "Phone" provider**

3. **Choose an SMS provider:**
   - Twilio (Recommended)
   - MessageBird
   - Vonage

4. **Add your SMS provider credentials**

---

### Step 6: Set Up Admin User

1. **Create an admin account** in the app:
   - Go to: `http://localhost:8080/admin-auth`
   - Click "Sign Up"
   - Use email: `yaswanthvenkata245@gmail.com`
   - Create a password

2. **Grant admin role** (via SQL Editor):
   ```sql
   -- Get the user ID
   SELECT id, email FROM auth.users WHERE email = 'yaswanthvenkata245@gmail.com';
   
   -- Grant admin role (replace USER_ID with actual ID)
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('USER_ID', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

---

### Step 7: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

---

## 📊 Database Schema Overview

### Core Schema

```sql
-- Enums
app_role: 'admin' | 'delivery_partner' | 'customer'
delivery_status: 'delivered' | 'missed' | 'paused' | 'upcoming'
receipt_status: 'paid' | 'due' | 'processing'

-- Main Tables
profiles (user_id, full_name, phone, address, avatar_url)
products (name, category, unit, price_per_unit, is_active)
subscriptions (user_id, product_id, quantity, is_active)
deliveries (user_id, product_id, delivery_date, status, quantity)
wallets (user_id, balance)
wallet_transactions (wallet_id, user_id, amount, type, description)
receipts (user_id, billing_month, total_amount, status)
receipt_items (receipt_id, product_id, quantity, amount)
```

### Security Features

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ **Role-based access control** (admin, customer, delivery_partner)
- ✅ **Automatic profile creation** on user signup
- ✅ **Automatic wallet creation** on user signup
- ✅ **Secure admin role checking** function

---

## 🔒 Row Level Security (RLS) Policies

### Profiles
- Users can view/update their own profile
- Admins can view all profiles

### Products
- Anyone can view active products
- Admins can manage all products

### Subscriptions
- Users can manage their own subscriptions
- Admins can view all subscriptions

### Deliveries
- Users can view their own deliveries
- Users can update upcoming deliveries
- Delivery partners can update all deliveries
- Admins can manage all deliveries

### Wallets
- Users can view their own wallet
- Admins can view all wallets

### Wallet Transactions
- Users can view their own transactions
- Admins can manage all transactions

---

## 🧪 Testing the Database

### Test Customer Flow:

1. **Sign up as a customer:**
   - Go to `http://localhost:8080/`
   - Click "Sign Up"
   - Enter email and password
   - ✅ Profile, wallet, and customer role should be auto-created

2. **Browse products:**
   - Go to Products page
   - ✅ Should see 8 default products

3. **Create a subscription:**
   - Select a product
   - Subscribe
   - ✅ Subscription should be created

4. **Check wallet:**
   - Go to Wallet page
   - ✅ Should show ₹0 balance initially

### Test Admin Flow:

1. **Login as admin:**
   - Go to `http://localhost:8080/admin-auth`
   - Login with admin credentials
   - ✅ Should access admin dashboard

2. **View users:**
   - Go to User Management
   - ✅ Should see all registered users

3. **Manage products:**
   - Go to Product Management
   - ✅ Should see all products
   - ✅ Can create/update products

4. **View deliveries:**
   - Go to Delivery Management
   - ✅ Should see all scheduled deliveries

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch" error

**Cause:** Invalid API key or network issue

**Solution:**
1. Verify your API key is correct
2. Check your internet connection
3. Ensure Supabase project is active
4. Check browser console for detailed errors

### Issue: "relation does not exist" error

**Cause:** Database tables not created

**Solution:**
1. Run all migration files in order
2. Verify tables exist in Supabase dashboard
3. Check SQL Editor for any errors

### Issue: "permission denied" error

**Cause:** RLS policies not set up correctly

**Solution:**
1. Ensure all migration files ran successfully
2. Check RLS policies in Supabase dashboard
3. Verify user has correct role assigned

### Issue: Admin can't access admin panel

**Cause:** Admin role not assigned

**Solution:**
```sql
-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-id', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 📁 Migration Files Reference

| File | Purpose |
|------|---------|
| `20260111101716_ecc6ed7f-d37a-449d-a1dc-f88b7b8413f4.sql` | Core schema, tables, RLS policies |
| `003_create_products_table.sql` | Enhanced product table |
| `004_dual_pricing_system.sql` | Dual pricing (regular/subscription) |
| `005_update_product_images.sql` | Product image updates |
| `006_notifications_system.sql` | Notification system |
| `007_automatic_delivery_confirmation.sql` | Delivery confirmation automation |
| `20260111_admin_system.sql` | Admin system tables |
| `20260111_create_admin_user.sql` | Admin user creation |

---

## 🎯 Quick Setup Checklist

- [ ] Get Supabase API key
- [ ] Update `.env` file with real API key
- [ ] Set `VITE_DEV_MODE=false`
- [ ] Run all migration files
- [ ] Verify tables exist
- [ ] Enable Email authentication
- [ ] (Optional) Enable Phone authentication
- [ ] Create admin account
- [ ] Grant admin role via SQL
- [ ] Restart dev server
- [ ] Test customer signup
- [ ] Test admin login
- [ ] Test product browsing
- [ ] Test subscription creation

---

## 🔄 Switching Between Dev and Production

### Development Mode (Current):
```env
VITE_DEV_MODE=true
```
- Uses localStorage
- Uses mock data
- Works offline
- No database needed

### Production Mode:
```env
VITE_DEV_MODE=false
VITE_SUPABASE_PUBLISHABLE_KEY=your-real-key
```
- Uses Supabase database
- Real authentication
- Real data persistence
- Requires internet connection

---

## 📞 Need Help?

If you encounter issues:

1. **Check browser console** (F12 → Console) for errors
2. **Check Supabase logs** in dashboard
3. **Verify all migrations** ran successfully
4. **Check RLS policies** are enabled
5. **Verify API key** is correct

---

**Current Status:** App is running in **Development Mode** ✅

**To use production database:** Follow Steps 1-7 above

**Server:** http://localhost:8080/

---

**All database schema files are ready in `supabase/migrations/` folder!** 🚀
