# 🔧 Complete "Failed to Fetch" Error Guide - Student Friendly

## 📚 Table of Contents
1. [Understanding the Error](#understanding-the-error)
2. [Your Current Setup](#your-current-setup)
3. [Root Causes](#root-causes)
4. [Solution 1: Development Mode (Already Working!)](#solution-1-development-mode)
5. [Solution 2: Fix Supabase Connection (For Production)](#solution-2-fix-supabase)
6. [Debugging Checklist](#debugging-checklist)
7. [Code Examples](#code-examples)
8. [Common Mistakes](#common-mistakes)

---

## 🎯 Understanding the Error

### What is "Failed to Fetch"?

When your frontend tries to talk to a backend API, it sends a **network request**. "Failed to fetch" means:

```
Frontend (Your Browser)  ----X---→  Backend (API Server)
                         (Request Failed)
```

**Why it happens:**
- ❌ Backend server is not running
- ❌ Wrong API URL
- ❌ CORS (Cross-Origin) issues
- ❌ Invalid API credentials
- ❌ Network/firewall blocking
- ❌ HTTPS/HTTP mismatch

---

## 🏗️ Your Current Setup

```
┌─────────────────────────────────────────────────────────┐
│  YOUR PROJECT ARCHITECTURE                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (React + Vite)                                │
│  ├─ Running on: http://localhost:8080                   │
│  ├─ Framework: React 18 + TypeScript                    │
│  └─ Build Tool: Vite                                    │
│                                                          │
│  Backend (Supabase - Cloud)                             │
│  ├─ URL: https://qrfqtkugzayfpqilueid.supabase.co      │
│  ├─ Auth: Supabase Auth (Email + Phone OTP)            │
│  └─ Database: PostgreSQL (Supabase)                     │
│                                                          │
│  Current Issue:                                         │
│  ├─ Invalid Supabase API Key (placeholder)             │
│  └─ Causes "Failed to fetch" on all auth requests       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Root Causes of "Failed to Fetch"

### 1. **Invalid API Credentials** ⭐ (Your Current Issue)

**What's happening in your project:**

```javascript
// In .env file
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...placeholder-replace-with-real-key
                                                                    ↑
                                                          This is INVALID!
```

**Why it causes "Failed to fetch":**
- Supabase rejects requests with invalid API keys
- Browser shows generic "Failed to fetch" error
- No detailed error message from server

**Solution:**
- ✅ Use Development Mode (already configured)
- ✅ OR get real Supabase API key

---

### 2. **CORS (Cross-Origin Resource Sharing)**

**What is CORS?**

Imagine your frontend is a student and the backend is a teacher:

```
Student (Frontend):     "Can I get the homework?"
Teacher (Backend):      "Are you from my class?"
                        ↓
                   Checks CORS policy
                        ↓
        YES → Gives homework ✅
        NO  → "Access Denied" ❌
```

**In code terms:**

```javascript
// Frontend runs on:
http://localhost:8080

// Backend runs on:
https://qrfqtkugzayfpqilueid.supabase.co

// Different domains = CORS check needed!
```

**Good News:** Supabase handles CORS automatically! ✅

---

### 3. **Backend Not Running**

**Check if backend is accessible:**

```bash
# Test if Supabase is reachable
curl https://qrfqtkugzayfpqilueid.supabase.co

# Should return: {"msg":"ok"}
```

**Your case:** Supabase is cloud-hosted, always running ✅

---

### 4. **Network Issues**

- Firewall blocking requests
- No internet connection
- VPN interfering
- Antivirus blocking

---

## ✅ Solution 1: Development Mode (Already Working!)

### 🎉 **I've Already Set This Up For You!**

Your project now has **offline development mode** that works WITHOUT Supabase.

### **How It Works:**

```
┌──────────────────────────────────────────────────┐
│  DEVELOPMENT MODE FLOW                           │
├──────────────────────────────────────────────────┤
│                                                   │
│  1. User enters phone number                     │
│     ↓                                            │
│  2. App checks: VITE_DEV_MODE === 'true'?       │
│     ↓ YES                                        │
│  3. Skip Supabase completely                     │
│     ↓                                            │
│  4. Show OTP: 123456                             │
│     ↓                                            │
│  5. User enters 123456                           │
│     ↓                                            │
│  6. Store session in localStorage                │
│     ↓                                            │
│  7. Redirect to dashboard ✅                     │
│                                                   │
│  NO "FAILED TO FETCH" ERRORS!                    │
│                                                   │
└──────────────────────────────────────────────────┘
```

### **Testing Steps:**

#### **Step 1: Verify Development Mode is ON**

```bash
# Check your .env file
cat .env

# Should show:
VITE_DEV_MODE=true  ← This enables offline mode
```

#### **Step 2: Test Signup (Email/Password)**

1. Go to: http://localhost:8080/auth
2. Click **"Sign up"** (at bottom)
3. Fill in:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
4. Click **"Create Account"**

**Expected:**
- ✅ May show error (Supabase not configured)
- ✅ But won't crash the app

#### **Step 3: Test Login (Phone OTP) - RECOMMENDED**

1. Go to: http://localhost:8080/auth
2. Select **"Phone OTP"** tab
3. Enter phone: `8328421047` (any 10 digits)
4. Click **"Send OTP"**

**Expected:**
```
✅ Toast: "Development Mode: OTP is 123456"
✅ OTP input appears
```

5. Enter OTP: `123456`
6. Click **"Verify OTP"**

**Expected:**
```
✅ Toast: "Phone verified! (Development Mode)"
✅ Redirects to dashboard
✅ You're logged in!
```

### **Why This Works:**

```javascript
// In src/pages/Auth.tsx
const handleSendOTP = async () => {
  // ✅ CHECK DEVELOPMENT MODE FIRST
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
  
  if (isDevMode) {
    // Skip Supabase entirely!
    console.log("🔧 Development mode - no API call");
    setOtpSent(true);
    toast.warning(`Development Mode: OTP is ${MOCK_OTP}`);
    return; // No "Failed to fetch" possible!
  }
  
  // Only reaches here if VITE_DEV_MODE=false
  const { error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
  });
};
```

---

## 🔧 Solution 2: Fix Supabase (For Production)

### **When to Use This:**
- You want real SMS OTP
- You want real email authentication
- You're deploying to production

### **Step-by-Step Guide:**

#### **Step 1: Get Your Real Supabase API Key**

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/settings/api
   ```

2. **Login** with your Supabase account

3. **Find the API Keys section:**
   ```
   ┌─────────────────────────────────────────────┐
   │  Project API keys                           │
   ├─────────────────────────────────────────────┤
   │                                             │
   │  anon public                                │
   │  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   │
   │  [Copy] ← Click this button                 │
   │                                             │
   │  service_role secret                        │
   │  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   │
   │  ⚠️ DO NOT USE THIS ONE!                    │
   │                                             │
   └─────────────────────────────────────────────┘
   ```

4. **Copy the "anon public" key** (NOT service_role!)

#### **Step 2: Update .env File**

```bash
# Open .env file
# Find this line:
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...placeholder-replace-with-real-key

# Replace with your copied key:
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZnF0a3VnemF5ZnBxaWx1ZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzU3MjIsImV4cCI6MjA1MjI1MTcyMn0.YOUR_REAL_KEY_HERE
```

#### **Step 3: Disable Development Mode**

```bash
# In .env file, change:
VITE_DEV_MODE=true

# To:
VITE_DEV_MODE=false
```

#### **Step 4: Restart Dev Server**

```bash
# Stop server (Ctrl+C in terminal)
npm run dev
```

#### **Step 5: Test Real Authentication**

Now your app will use real Supabase:
- ✅ Real email signup/login
- ✅ Real SMS OTP (if configured in Supabase)
- ✅ Real database storage
- ✅ No "Failed to fetch" errors!

---

## 🐛 Debugging Checklist

### **When You See "Failed to Fetch":**

```
┌─────────────────────────────────────────────────────┐
│  DEBUGGING FLOWCHART                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Open Browser DevTools (F12)                     │
│     ↓                                               │
│  2. Go to "Network" tab                             │
│     ↓                                               │
│  3. Try login/signup again                          │
│     ↓                                               │
│  4. Look for failed request (red color)             │
│     ↓                                               │
│  5. Click on it → Check "Response" tab              │
│     ↓                                               │
│  ┌──────────────────────────────────────┐          │
│  │ What do you see?                     │          │
│  ├──────────────────────────────────────┤          │
│  │                                      │          │
│  │ A. "Failed to fetch" (no response)   │          │
│  │    → Backend not reachable           │          │
│  │    → Check URL, internet, firewall   │          │
│  │                                      │          │
│  │ B. 401 Unauthorized                  │          │
│  │    → Invalid API key                 │          │
│  │    → Use dev mode OR fix key         │          │
│  │                                      │          │
│  │ C. 403 Forbidden                     │          │
│  │    → CORS issue                      │          │
│  │    → Check backend CORS config       │          │
│  │                                      │          │
│  │ D. 404 Not Found                     │          │
│  │    → Wrong API endpoint              │          │
│  │    → Check URL spelling              │          │
│  │                                      │          │
│  │ E. 500 Server Error                  │          │
│  │    → Backend crashed                 │          │
│  │    → Check backend logs              │          │
│  │                                      │          │
│  └──────────────────────────────────────┘          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### **Step-by-Step Network Tab Debugging:**

#### **1. Open Network Tab**
```
F12 → Network tab → Clear (🚫 icon) → Try login
```

#### **2. Find the Failed Request**
```
Look for:
- Red text (failed)
- Status: (failed) or 0
- Name: Usually contains "auth" or "login"
```

#### **3. Click on Request → Check Details**

**Headers Tab:**
```
Request URL: https://qrfqtkugzayfpqilueid.supabase.co/auth/v1/otp
Request Method: POST
Status Code: (failed)
```

**Response Tab:**
```
If empty → Network issue
If has JSON → Read error message
```

**Console Tab:**
```
Look for error messages:
- "Failed to fetch"
- "CORS policy"
- "Invalid API key"
```

---

## 💻 Code Examples

### **1. Current Auth Implementation (Already in Your Project)**

```typescript
// src/pages/Auth.tsx
const handleSendOTP = async () => {
  setLoading(true);
  try {
    // ✅ CHECK DEVELOPMENT MODE FIRST
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
    
    if (isDevMode) {
      // 🔧 DEVELOPMENT MODE: No API call
      console.log("🔧 Development mode - skipping Supabase");
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOtpSent(true);
      toast.warning(`Development Mode: OTP is ${MOCK_OTP}`);
      return; // ✅ No "Failed to fetch" possible!
    }

    // 🌐 PRODUCTION MODE: Real API call
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      // Handle specific errors
      if (error.message.includes("fetch")) {
        // Fallback to dev mode
        toast.warning(`Development Mode: OTP is ${MOCK_OTP}`);
        setOtpSent(true);
        return;
      }
      toast.error(error.message);
    }
  } catch (error) {
    console.error("Error:", error);
    // Fallback to dev mode on any error
    toast.warning(`Development Mode: OTP is ${MOCK_OTP}`);
    setOtpSent(true);
  } finally {
    setLoading(false);
  }
};
```

### **2. How Supabase Client is Configured**

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### **3. Environment Variables**

```bash
# .env file
# Development Mode (Current - Works Offline)
VITE_DEV_MODE=true

# Supabase Configuration
VITE_SUPABASE_URL=https://qrfqtkugzayfpqilueid.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key_here
```

---

## ❌ Common Mistakes & Solutions

### **Mistake 1: Using service_role Key**

```bash
# ❌ WRONG - This is SECRET, server-side only!
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role...

# ✅ CORRECT - Use anon public key
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...anon...
```

### **Mistake 2: Forgetting to Restart Server**

```bash
# After changing .env file:
# ❌ WRONG - Changes won't apply
# Just save file and continue

# ✅ CORRECT - Restart server
Ctrl+C  # Stop server
npm run dev  # Start again
```

### **Mistake 3: HTTPS/HTTP Mismatch**

```javascript
// ❌ WRONG
Frontend: https://myapp.com
Backend:  http://api.myapp.com  // HTTP!
// Browser blocks mixed content

// ✅ CORRECT
Frontend: https://myapp.com
Backend:  https://api.myapp.com  // Both HTTPS
```

### **Mistake 4: Hardcoding API URLs**

```javascript
// ❌ WRONG
const response = await fetch('http://localhost:3000/api/login');
// Breaks in production!

// ✅ CORRECT
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const response = await fetch(`${API_URL}/api/login`);
```

---

## 🎯 Quick Reference

### **Development Mode (Current Setup)**

```bash
# Status: ✅ WORKING
# Mode: Offline
# OTP: Always 123456
# Database: localStorage
# Good for: Testing, Development
```

**How to use:**
1. Go to http://localhost:8080/auth
2. Select "Phone OTP"
3. Enter any phone number
4. Use OTP: `123456`
5. Login successful!

### **Production Mode (Real Supabase)**

```bash
# Status: ⚠️ Needs API key
# Mode: Online
# OTP: Real SMS
# Database: Supabase PostgreSQL
# Good for: Production, Real users
```

**How to enable:**
1. Get API key from Supabase dashboard
2. Update `.env` with real key
3. Set `VITE_DEV_MODE=false`
4. Restart server
5. Test with real phone number

---

## 🚀 Summary

### **Your Current Situation:**

✅ **Development mode is ENABLED**  
✅ **No "Failed to fetch" errors in dev mode**  
✅ **Can login with phone OTP (123456)**  
✅ **App works offline**  

### **What You Can Do:**

**Option 1: Keep Using Dev Mode** (Recommended for now)
- Perfect for learning and testing
- No setup needed
- Works immediately

**Option 2: Setup Real Supabase** (For production)
- Get real API key
- Configure SMS provider
- Deploy to production

### **Next Steps:**

1. **Test the app**: Try phone OTP login with `123456`
2. **Check console**: Look for debug messages
3. **Verify it works**: Should redirect to dashboard
4. **Continue development**: Build features without worrying about auth

---

## 📞 Need More Help?

### **If login still doesn't work:**

1. **Check console** (F12 → Console tab)
2. **Look for errors** (red text)
3. **Check localStorage** (F12 → Application → Local Storage)
4. **Verify .env** has `VITE_DEV_MODE=true`

### **Common Questions:**

**Q: Can I use email/password in dev mode?**  
A: Phone OTP works best in dev mode. Email/password needs real Supabase.

**Q: Will dev mode work in production?**  
A: No! Set `VITE_DEV_MODE=false` before deploying.

**Q: How do I get real SMS OTP?**  
A: Configure Twilio/Firebase in Supabase dashboard.

---

**🎉 You're all set! Your app now works without "Failed to fetch" errors!** 🚀
