# 🔑 FIX SUPABASE API KEY - QUICK GUIDE

## ❌ Current Issue
Your `.env` file has a **placeholder API key** instead of the real Supabase anon key.

**Current (Invalid)**:
```
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZnF0a3VnemF5ZnBxaWx1ZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzU3MjIsImV4cCI6MjA1MjI1MTcyMn0.placeholder-replace-with-real-key
```

The key ends with `.placeholder-replace-with-real-key` which is **NOT valid**.

---

## ✅ How to Fix

### Step 1: Get Your Real Supabase Anon Key

1. **Go to Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/settings/api
   ```

2. **Login** to your Supabase account

3. **Find the "anon public" key** in the API settings:
   - Look for the section called **"Project API keys"**
   - Copy the **"anon public"** key (NOT the service_role key)
   - It's a very long string (200+ characters)
   - It looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZnF0a3VnemF5ZnBxaWx1ZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzU3MjIsImV4cCI6MjA1MjI1MTcyMn0.REAL_SIGNATURE_HERE`

### Step 2: Update Your `.env` File

Replace the current placeholder key with your real key:

**File**: `.env`
```env
# Supabase Configuration
# Project ID: qrfqtkugzayfpqilueid
# Get your anon key from: https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/settings/api

VITE_SUPABASE_URL=https://qrfqtkugzayfpqilueid.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_REAL_ANON_KEY_HERE
```

### Step 3: Restart the Development Server

After updating the `.env` file:

1. **Stop the current server** (Press `Ctrl+C` in the terminal)
2. **Restart**: `npm run dev`
3. **Refresh the browser**

---

## 🔍 Alternative: Check if Project Exists

If you don't have access to the Supabase dashboard or the project doesn't exist:

### Option 1: Create a New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: Daily Drop
   - **Database Password**: (create a strong password)
   - **Region**: Choose closest to you
4. Wait for project to be created (~2 minutes)
5. Get your API keys from Settings → API
6. Update `.env` with new URL and keys

### Option 2: Use Existing Project

If you have another Supabase project:
1. Get the project URL and anon key
2. Update both values in `.env`:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
   ```

---

## 🚨 Important Notes

### Security:
- ✅ **anon public key** is SAFE to use in frontend code
- ❌ **service_role key** should NEVER be in frontend code
- ✅ The `.env` file should be in `.gitignore` (it already is)

### Key Format:
A valid Supabase anon key has **3 parts** separated by dots:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.
eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZnF0a3VnemF5ZnBxaWx1ZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzU3MjIsImV4cCI6MjA1MjI1MTcyMn0
.
SIGNATURE_PART_HERE (this is what's missing!)
```

Your current key is missing the **third part** (signature).

---

## 🧪 Test After Fixing

Once you've updated the key and restarted:

1. Open http://localhost:8080/
2. Try to login/signup
3. Check browser console for errors
4. If you see "Invalid API key" or "401 Unauthorized", the key is still wrong

---

## 📞 Need Help?

If you're stuck:

1. **Check Supabase Dashboard**: Make sure the project `qrfqtkugzayfpqilueid` exists
2. **Verify Project URL**: Try opening `https://qrfqtkugzayfpqilueid.supabase.co` in browser
3. **Create New Project**: If the old one doesn't exist, create a fresh one
4. **Check Console**: Look for specific error messages in browser console

---

## ✅ Quick Fix Command

I can help you update the `.env` file once you provide the real anon key. Just:

1. Get your anon key from Supabase dashboard
2. Tell me: "Update .env with key: [paste your key here]"
3. I'll update the file for you

---

**Current Status**: ❌ Invalid API Key  
**Action Required**: Get real Supabase anon key and update `.env`  
**Time to Fix**: ~2 minutes
