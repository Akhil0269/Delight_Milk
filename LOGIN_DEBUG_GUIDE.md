# 🔧 LOGIN ISSUE - DEBUGGING GUIDE

## 🎯 Issue
Login is not opening/redirecting to dashboard after OTP verification.

## ✅ Fixes Applied

### 1. **AuthContext.tsx - Fixed useEffect cleanup**
- **Problem**: Early `return` in useEffect prevented proper cleanup function setup
- **Fix**: Restructured to always return a cleanup function
- **Result**: React component lifecycle now works correctly

### 2. **Added Console Logging**
- Auth.tsx: Logs navigation steps
- AuthContext.tsx: Logs session loading and auth state changes
- Helps track exactly where the flow breaks

## 🧪 How to Test

### **Step 1: Clear Browser Data**
1. Open browser DevTools (F12)
2. Go to **Application** tab → **Storage**
3. Click **"Clear site data"**
4. Refresh the page

### **Step 2: Open Console**
1. Keep DevTools open
2. Go to **Console** tab
3. Watch for log messages

### **Step 3: Test Phone OTP Login**
1. Go to: http://localhost:8080/auth
2. Select **"Phone OTP"** tab
3. Enter phone: `8328421047`
4. Click **"Send OTP"**

**Expected Console Output:**
```
📱 Attempting to send OTP to: +918328421047
🔧 Development mode enabled - skipping Supabase
🔐 Development OTP: 123456
```

**Expected UI:**
- Toast: "Development Mode: OTP is 123456"
- OTP input field appears

### **Step 4: Enter OTP**
1. Enter OTP: `123456`
2. Click **"Verify OTP"**

**Expected Console Output:**
```
🔐 Attempting to verify OTP for: +918328421047
🔧 Development mode verification
📦 Storing dev session in localStorage
✅ Dev session stored, showing success toast
🚀 Navigating to /dashboard
✅ Development mode: Loading user from localStorage
```

**Expected Result:**
- ✅ Toast: "Phone verified! (Development Mode)"
- ✅ Redirects to `/dashboard`
- ✅ Dashboard loads successfully

## 🔍 Troubleshooting

### **Issue: Still redirecting back to /auth**

**Check Console for:**
```
✅ Development mode: Loading user from localStorage
```

If you DON'T see this:
1. Check localStorage in DevTools:
   - Application → Local Storage → http://localhost:8080
   - Should see: `dev_session: "active"` and `dev_user: {...}`

2. Check .env file:
   - Should have: `VITE_DEV_MODE=true`

3. Restart dev server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### **Issue: Navigation happens but redirects back**

This means ProtectedRoute is not recognizing the user.

**Check Console for:**
```
✅ Development mode: Loading user from localStorage
```

If missing:
1. Clear localStorage
2. Try login again
3. Check if `dev_user` and `dev_session` are being set

### **Issue: Error in console**

**Common errors:**

1. **"useAuth must be used within an AuthProvider"**
   - This shouldn't happen with current setup
   - If it does, check App.tsx wrapping

2. **"Cannot read property 'user' of undefined"**
   - AuthContext not initialized properly
   - Restart dev server

3. **"Failed to fetch"**
   - Development mode should catch this
   - Check if `VITE_DEV_MODE=true` in .env

## 📋 Verification Checklist

After login, verify:

- [ ] Console shows: "✅ Development mode: Loading user from localStorage"
- [ ] localStorage has `dev_session` = "active"
- [ ] localStorage has `dev_user` with user data
- [ ] URL changes to `/dashboard`
- [ ] Dashboard page loads (not redirected back to /auth)
- [ ] User info visible in dashboard

## 🎯 Quick Test Commands

### **Check if dev mode is enabled:**
```javascript
// In browser console
console.log(import.meta.env.VITE_DEV_MODE);
// Should output: "true"
```

### **Check localStorage:**
```javascript
// In browser console
console.log(localStorage.getItem('dev_session'));
console.log(localStorage.getItem('dev_user'));
```

### **Manually set session (for testing):**
```javascript
// In browser console
localStorage.setItem('dev_session', 'active');
localStorage.setItem('dev_user', JSON.stringify({
  id: 'dev_1234567890',
  phone: '1234567890',
  email: '1234567890@phone.dev',
  full_name: 'Test User',
  created_at: new Date().toISOString()
}));
// Then refresh page
location.reload();
```

## 🔄 If Still Not Working

1. **Stop dev server** (Ctrl+C in terminal)
2. **Clear browser cache and localStorage**
3. **Restart dev server**: `npm run dev`
4. **Try login again**
5. **Check console for all log messages**

## 📞 What to Report

If still having issues, provide:

1. **Console output** (copy all messages)
2. **localStorage contents** (screenshot from DevTools)
3. **Current URL** when stuck
4. **Any error messages**

## ✅ Expected Full Flow

```
1. User enters phone number
   ↓
2. Clicks "Send OTP"
   ↓
3. Console: "🔧 Development mode enabled"
   ↓
4. Toast: "Development Mode: OTP is 123456"
   ↓
5. User enters 123456
   ↓
6. Clicks "Verify OTP"
   ↓
7. Console: "📦 Storing dev session"
   ↓
8. Console: "🚀 Navigating to /dashboard"
   ↓
9. Console: "✅ Development mode: Loading user from localStorage"
   ↓
10. Dashboard loads ✅
```

---

**The fix is applied. Please test and check the console output!** 🚀
