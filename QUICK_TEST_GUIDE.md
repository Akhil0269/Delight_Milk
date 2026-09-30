# 🧪 Quick Test Guide - Login/Signup

## ✅ Your App is Now Fixed and Running!

**Server Status:** Running on http://localhost:8080/

---

## 🎯 Test Authentication Now

### Method 1: Phone OTP Login (Recommended)

1. **Open the app:** http://localhost:8080/
2. **Click on "Login" or "Sign Up"**
3. **Select "Phone OTP"** method
4. **Enter Phone Number:** `9876543210` (or any 10-digit number)
5. **Click "Send OTP"**
6. **You'll see a toast message:** "Development Mode: OTP is 123456"
7. **Enter OTP:** `123456`
8. **Click "Verify OTP"**
9. ✅ **Success!** You should be redirected to the dashboard

### Method 2: Email/Password Login

#### First Time (Sign Up):
1. **Open the app:** http://localhost:8080/
2. **Click "Don't have an account? Sign up"**
3. **Select "Email"** method
4. **Enter Details:**
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
5. **Click "Create Account"**
6. ✅ **Success!** Account created and logged in

#### Returning User (Sign In):
1. **Open the app:** http://localhost:8080/
2. **Select "Email"** method
3. **Enter the same credentials:**
   - Email: `test@example.com`
   - Password: `password123`
4. **Click "Sign In"**
5. ✅ **Success!** Logged in

---

## 🔐 Development Mode Credentials

### Phone OTP
- **Any Phone Number:** Works (e.g., 9876543210, 1234567890)
- **OTP Code:** Always `123456`

### Email/Password
- **Email:** Any email works
- **Password:** Minimum 6 characters
- **Note:** You must sign up first, then you can sign in

---

## 🎨 What You'll See After Login

After successful login, you'll be redirected to the **Dashboard** where you can:

- 📦 View today's delivery status
- 💳 Manage your wallet
- 🛍️ Browse products
- 📅 View delivery calendar
- 📍 Manage addresses
- 🎁 Access referral program
- 🎧 Contact support

---

## 🐛 If Something Goes Wrong

### Clear Browser Data
If you encounter any issues:

1. **Open Browser Console:** Press `F12` → Console tab
2. **Clear localStorage:**
   ```javascript
   localStorage.clear()
   ```
3. **Refresh the page:** Press `F5`
4. **Try logging in again**

### Check Server Status
Make sure the dev server is running:
- Look for: `VITE v5.4.19 ready in XXX ms`
- URL should be: `http://localhost:8080/`

### Restart Server
If needed:
```bash
# Press Ctrl+C to stop
npm run dev
```

---

## 📊 Current Configuration

- **Mode:** Development (Offline)
- **Database:** localStorage (Browser)
- **Phone OTP:** Mock (123456)
- **Email Auth:** Local storage
- **Session:** Persists in browser

---

## 🚀 Ready for Production?

When you're ready to deploy with real Supabase:

1. Get your real Supabase API key
2. Update `.env`:
   ```env
   VITE_DEV_MODE=false
   VITE_SUPABASE_PUBLISHABLE_KEY=your-real-key
   ```
3. Set up database tables (see LOGIN_SIGNUP_FIX_GUIDE.md)
4. Restart server

---

## ✨ Features to Test

After logging in, try these features:

1. **Add Money to Wallet** (Test Mode - No real payment)
2. **Browse Products** (Milk, Curd, Ghee, etc.)
3. **Add to Cart**
4. **View Order History**
5. **Manage Delivery Addresses**
6. **Refer & Earn** (Get your referral code)
7. **Customer Support** (FAQs and contact)

---

**Everything is working! Start testing now! 🎉**

Open: http://localhost:8080/
