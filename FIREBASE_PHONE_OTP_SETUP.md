# Firebase Phone OTP Authentication Setup Guide

## 🔥 Firebase Phone Authentication Setup

This guide will help you set up Firebase Phone Authentication for SMS OTP in your Daily Drop application.

## 📋 Step-by-Step Setup

### Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Click "Add project" or select existing project

2. **Create New Project**
   - Project name: `daily-drop` (or your preferred name)
   - Enable Google Analytics (optional)
   - Click "Create project"

3. **Wait for Setup**
   - Firebase will set up your project
   - Click "Continue" when ready

### Step 2: Add Web App to Firebase

1. **Add Web App**
   - In Firebase Console, click the web icon (</>) to add a web app
   - App nickname: `daily-drop-web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

2. **Copy Firebase Config**
   - You'll see your Firebase configuration object
   - **IMPORTANT**: Copy this configuration
   - Example:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "daily-drop.firebaseapp.com",
     projectId: "daily-drop",
     storageBucket: "daily-drop.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456"
   };
   ```

### Step 3: Enable Phone Authentication

1. **Go to Authentication**
   - In Firebase Console sidebar
   - Click "Authentication"
   - Click "Get started" (if first time)

2. **Enable Phone Provider**
   - Go to "Sign-in method" tab
   - Find "Phone" in the list
   - Click on "Phone"
   - Toggle "Enable"
   - Click "Save"

3. **Configure reCAPTCHA**
   - Phone auth uses reCAPTCHA for verification
   - Add your domain to authorized domains:
     - `localhost` (for development)
     - Your production domain

### Step 4: Set Up Environment Variables

1. **Create/Update `.env` file**
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

2. **Replace with Your Values**
   - Copy values from Firebase Console
   - Paste into `.env` file
   - Save the file

### Step 5: Configure Firebase in Code

The Firebase configuration is already set up in:
- `src/lib/firebase.ts` - Firebase initialization
- `src/pages/Auth.tsx` - Will be updated to use Firebase

### Step 6: Update Auth.tsx for Firebase

The Auth component needs to be updated to use Firebase Phone Authentication instead of Supabase.

**Key Changes:**
1. Import Firebase Auth
2. Use `RecaptchaVerifier` for verification
3. Use `signInWithPhoneNumber` to send OTP
4. Use `confirmationResult.confirm(code)` to verify OTP

### Step 7: Test Phone Authentication

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test OTP Flow**
   - Go to http://localhost:8080/auth
   - Select "Phone OTP"
   - Enter phone number
   - Complete reCAPTCHA
   - Receive SMS with OTP
   - Enter OTP
   - Verify authentication

## 🔧 Firebase Phone Auth Features

### Advantages:
✅ **Free Tier**: 10,000 verifications/month free
✅ **No SMS Provider Needed**: Firebase handles SMS
✅ **Built-in reCAPTCHA**: Spam protection
✅ **Global Coverage**: Works in most countries
✅ **Easy Setup**: No external service configuration
✅ **Automatic Retry**: Built-in retry logic

### Limitations:
⚠️ **reCAPTCHA Required**: Users must complete reCAPTCHA
⚠️ **Rate Limits**: 10,000 free verifications/month
⚠️ **Country Restrictions**: Some countries not supported

## 💰 Pricing

### Free Tier (Spark Plan):
- **10,000 verifications/month**: FREE
- **After 10,000**: $0.01 per verification
- **No credit card required** for free tier

### Blaze Plan (Pay as you go):
- **First 10,000**: FREE
- **Additional**: $0.01 per verification
- **Example**: 50,000 verifications = $400/month

## 📱 Supported Countries

Firebase Phone Auth works in 200+ countries including:
- ✅ India
- ✅ United States
- ✅ United Kingdom
- ✅ Most European countries
- ✅ Most Asian countries

**Check full list**: https://firebase.google.com/docs/auth/web/phone-auth#supported-countries

## 🔒 Security Features

### reCAPTCHA Protection:
- Prevents bot attacks
- Protects against spam
- Invisible or checkbox mode

### Rate Limiting:
- Automatic rate limiting
- Prevents abuse
- Configurable limits

### Phone Number Verification:
- Real phone numbers only
- SMS delivery confirmation
- OTP expiration (default: 5 minutes)

## 🎯 Implementation Details

### Send OTP:
```typescript
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Set up reCAPTCHA
const recaptchaVerifier = new RecaptchaVerifier(
  'recaptcha-container',
  { size: 'invisible' },
  auth
);

// Send OTP
const confirmationResult = await signInWithPhoneNumber(
  auth,
  phoneNumber,
  recaptchaVerifier
);

// Store confirmation result for verification
```

### Verify OTP:
```typescript
// Verify OTP
const result = await confirmationResult.confirm(otp);
const user = result.user;

// User is now authenticated
console.log('User:', user);
```

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Firebase project created
- [ ] Phone authentication enabled
- [ ] Environment variables configured
- [ ] Production domain added to authorized domains
- [ ] reCAPTCHA configured
- [ ] Tested with real phone numbers
- [ ] Rate limits configured
- [ ] Monitoring set up

## 🔧 Troubleshooting

### Error: "reCAPTCHA verification failed"
**Solution:**
- Check if domain is authorized in Firebase Console
- Ensure reCAPTCHA is properly initialized
- Try visible reCAPTCHA instead of invisible

### Error: "Invalid phone number"
**Solution:**
- Use E.164 format: +919876543210
- Include country code
- Remove spaces and special characters

### Error: "SMS not received"
**Solution:**
- Check phone number is correct
- Verify country is supported
- Check Firebase Console logs
- Wait a few minutes (SMS can be delayed)

### Error: "Quota exceeded"
**Solution:**
- Upgrade to Blaze plan
- Check usage in Firebase Console
- Implement rate limiting in your app

## 📊 Monitoring

### Firebase Console:
- **Authentication → Users**: See all authenticated users
- **Authentication → Usage**: Track verification count
- **Authentication → Settings**: Configure settings

### Analytics:
- Enable Google Analytics
- Track authentication events
- Monitor success/failure rates

## 🔄 Migration from Supabase

If migrating from Supabase:

1. **Keep Existing Users**:
   - Export users from Supabase
   - Import to Firebase (if needed)
   - Or maintain dual authentication

2. **Update Code**:
   - Replace Supabase auth calls
   - Use Firebase auth methods
   - Update environment variables

3. **Test Thoroughly**:
   - Test signup flow
   - Test login flow
   - Test OTP delivery
   - Test error handling

## 📞 Support

**Firebase Documentation:**
- Phone Auth: https://firebase.google.com/docs/auth/web/phone-auth
- Get Started: https://firebase.google.com/docs/web/setup

**Community:**
- Stack Overflow: https://stackoverflow.com/questions/tagged/firebase
- Firebase Community: https://firebase.google.com/community

## ✅ Next Steps

1. **Complete Firebase Setup** (15 minutes)
   - Create project
   - Enable phone auth
   - Copy configuration

2. **Update Environment Variables** (2 minutes)
   - Add Firebase config to `.env`
   - Restart dev server

3. **Update Auth Component** (10 minutes)
   - Implement Firebase phone auth
   - Test OTP flow

4. **Deploy** (when ready)
   - Add production domain
   - Test in production
   - Monitor usage

---

**Status**: ✅ Firebase Configuration Ready
**Next**: Add Firebase credentials to `.env` and update Auth component
