# 🔧 Login/Signup Fix Guide

## Current Issue
The login/signup page is not working because the Supabase configuration is incomplete. The app has a **placeholder API key** that needs to be replaced with your real Supabase key.

---

## ✅ SOLUTION 1: Development Mode (Quick Fix - Recommended for Testing)

This allows you to test the app **immediately without Supabase setup**.

### How It Works
- Uses **localStorage** instead of Supabase database
- All authentication happens locally in your browser
- Perfect for testing and development
- **No internet connection needed**

### Steps to Enable Development Mode

1. **Verify `.env` file** (should already be set):
   ```env
   VITE_DEV_MODE=true
   VITE_SUPABASE_URL=https://qrfqtkugzayfpqilueid.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZnF0a3VnemF5ZnBxaWx1ZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzU3MjIsImV4cCI6MjA1MjI1MTcyMn0.placeholder-replace-with-real-key
   ```

2. **Restart the dev server**:
   ```bash
   # Press Ctrl+C to stop the server
   npm run dev
   ```

3. **Test Login/Signup**:

   **For Phone OTP Login:**
   - Enter any 10-digit phone number (e.g., `9876543210`)
   - Click "Send OTP"
   - You'll see a toast message: **"Development Mode: OTP is 123456"**
   - Enter OTP: `123456`
   - Click "Verify OTP"
   - ✅ You'll be logged in!

   **For Email/Password Login:**
   - **Sign Up First:**
     - Click "Don't have an account? Sign up"
     - Enter your name, email, and password
     - Click "Create Account"
     - ✅ Account created in localStorage!
   
   - **Sign In:**
     - Enter the same email and password
     - Click "Sign In"
     - ✅ You'll be logged in!

### Development Mode Features
- ✅ Phone OTP: Always use `123456`
- ✅ Email/Password: Stored in browser localStorage
- ✅ Session persists across page refreshes
- ✅ Works completely offline
- ✅ No database setup needed

---

## 🚀 SOLUTION 2: Production Mode (Real Supabase Setup)

This connects to your real Supabase database for production use.

### Prerequisites
- Supabase account
- Access to your Supabase project dashboard

### Steps to Enable Production Mode

#### Step 1: Get Your Real Supabase API Key

1. Go to your Supabase project dashboard:
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/settings/api
   ```

2. Copy the **"anon" "public"** key (NOT the service_role key)
   - Look for the section labeled "Project API keys"
   - Copy the key under "anon public"

#### Step 2: Update `.env` File

Replace the placeholder key in your `.env` file:

```env
# Set to false for production
VITE_DEV_MODE=false

VITE_SUPABASE_URL=https://qrfqtkugzayfpqilueid.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-real-anon-key-here
```

#### Step 3: Set Up Database Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Step 4: Configure Email Authentication (Optional)

1. Go to **Authentication → Providers** in Supabase dashboard
2. Enable **Email** provider
3. Configure email templates if needed

#### Step 5: Configure Phone Authentication (Optional)

1. Go to **Authentication → Providers** in Supabase dashboard
2. Enable **Phone** provider
3. Choose an SMS provider (Twilio, MessageBird, etc.)
4. Add your SMS provider credentials

**Note:** If you don't configure SMS, the app will automatically fall back to development mode for phone OTP.

#### Step 6: Restart Dev Server

```bash
# Press Ctrl+C to stop
npm run dev
```

#### Step 7: Test Production Login

- **Email/Password**: Should work immediately
- **Phone OTP**: Only works if you configured SMS provider (otherwise falls back to dev mode)

---

## 🔍 Troubleshooting

### Issue: "Failed to fetch" error

**Cause:** Invalid Supabase API key or network issue

**Solution:**
1. Verify your API key is correct
2. Check your internet connection
3. The app will automatically fall back to development mode

### Issue: Phone OTP not sending SMS

**Cause:** SMS provider not configured in Supabase

**Solution:**
- Either configure SMS provider in Supabase
- Or use development mode (OTP: `123456`)

### Issue: Email verification required

**Cause:** Supabase email confirmation is enabled

**Solution:**
1. Check your email for verification link
2. Or disable email confirmation in Supabase:
   - Go to **Authentication → Settings**
   - Turn off "Enable email confirmations"

### Issue: Login page not loading

**Cause:** JavaScript error or missing dependencies

**Solution:**
```bash
# Reinstall dependencies
npm install
npm run dev
```

---

## 📋 Quick Reference

### Development Mode
- **Phone OTP**: `123456`
- **Email**: Any email works
- **Password**: Any password (min 6 chars)
- **Storage**: Browser localStorage

### Production Mode
- **Phone OTP**: Real SMS sent
- **Email**: Real email verification
- **Password**: Secure Supabase auth
- **Storage**: Supabase database

---

## 🎯 Recommended Approach

**For Testing/Development:**
→ Use **Development Mode** (VITE_DEV_MODE=true)

**For Production/Deployment:**
→ Use **Production Mode** (VITE_DEV_MODE=false) with real Supabase credentials

---

## 📞 Need Help?

If you're still having issues:

1. Check browser console for errors (F12 → Console)
2. Verify `.env` file is in the root directory
3. Ensure dev server was restarted after changing `.env`
4. Clear browser cache and localStorage

---

**Current Status:** Your app is configured for **Development Mode** ✅

**Next Step:** Restart the dev server and try logging in with:
- Phone: Any 10-digit number + OTP: `123456`
- OR Email: Any email + Any password (signup first, then login)
