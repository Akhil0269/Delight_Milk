# Supabase Phone OTP Setup Guide

## ✅ Updated to Use Real Supabase OTP

The code now uses Supabase's built-in phone OTP authentication. Follow these steps to configure it:

## 📋 Step-by-Step Setup

### Step 1: Enable Phone Authentication in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **daily-drop-main**
3. Navigate to **Authentication** → **Providers**
4. Find **Phone** provider
5. Toggle it **ON**

### Step 2: Configure SMS Provider (Choose One)

#### Option A: Twilio (Recommended - Most Popular)

**1. Create Twilio Account:**
- Go to https://www.twilio.com/try-twilio
- Sign up for free account
- Get $15 free credit

**2. Get Twilio Credentials:**
- Go to Twilio Console
- Find your **Account SID**
- Find your **Auth Token**
- Get a **Twilio Phone Number** (buy one or use trial number)

**3. Configure in Supabase:**
- In Supabase Phone settings:
  - Provider: Select **Twilio**
  - Account SID: `[Your Account SID]`
  - Auth Token: `[Your Auth Token]`
  - Twilio Phone Number: `[Your Twilio Number]`
  - Click **Save**

**4. Twilio Configuration:**
- In Twilio Console → Messaging → Services
- Create a Messaging Service
- Add your phone number to the service
- Enable geographic permissions for India

#### Option B: Twilio Verify (Easier Setup)

**1. Enable Twilio Verify:**
- In Twilio Console
- Go to Verify → Services
- Create a new Verify Service
- Copy the Service SID

**2. Configure in Supabase:**
- Provider: Select **Twilio Verify**
- Account SID: `[Your Account SID]`
- Auth Token: `[Your Auth Token]`
- Verify Service SID: `[Your Verify Service SID]`
- Click **Save**

#### Option C: MessageBird

**1. Create MessageBird Account:**
- Go to https://www.messagebird.com
- Sign up (€10 free credit)

**2. Get API Key:**
- Go to Dashboard → Developers → API Keys
- Copy your **Live API Key**

**3. Configure in Supabase:**
- Provider: Select **MessageBird**
- API Key: `[Your MessageBird API Key]`
- Originator: `[Your sender name or number]`
- Click **Save**

### Step 3: Test Phone Authentication

**1. Test in Your App:**
```
1. Go to http://localhost:8080/auth
2. Select "Customer"
3. Select "Phone OTP"
4. Enter your real phone number
5. Click "Send OTP"
6. Check your phone for SMS
7. Enter the OTP
8. Click "Verify OTP"
9. Should login successfully!
```

**2. Check Supabase Logs:**
- Go to Supabase Dashboard
- Authentication → Logs
- See OTP send/verify attempts

### Step 4: Configure Phone Number Format

**In Supabase Phone Settings:**
- Default Country: **IN** (India)
- Phone Number Format: **E.164** (automatic)
- This ensures numbers are formatted as +91XXXXXXXXXX

### Step 5: Set OTP Expiry (Optional)

**In Supabase Auth Settings:**
- Go to Authentication → Settings
- Find "OTP Expiry"
- Default: 60 seconds
- Recommended: 300 seconds (5 minutes)

## 💰 Pricing

### Twilio:
- **Free Tier**: $15 credit for new accounts
- **SMS Cost**: ~₹0.50 per SMS in India
- **Phone Number**: ~₹70/month
- **Verify Service**: Slightly cheaper than regular SMS

### MessageBird:
- **Free Tier**: €10 credit
- **SMS Cost**: Similar to Twilio
- **No monthly fees** for basic usage

### Recommendation:
- **Development**: Twilio (free $15 credit)
- **Production**: Compare rates, both are good

## 🔧 Troubleshooting

### Error: "Unsupported phone provider"
**Solution**: Phone provider not configured in Supabase
- Go to Supabase → Authentication → Providers
- Enable Phone provider
- Configure SMS provider (Twilio/MessageBird)

### Error: "Invalid phone number"
**Solution**: Wrong format
- Use 10 digits: `9876543210`
- Or with country code: `+919876543210`
- App auto-adds +91 if missing

### Error: "SMS not received"
**Solution**: Check Twilio/MessageBird
- Verify account is active
- Check SMS logs in provider dashboard
- Ensure phone number is verified (trial accounts)
- Check geographic permissions

### Error: "Invalid OTP"
**Solution**: OTP expired or wrong
- OTP expires in 60 seconds (default)
- Request new OTP
- Check for typos

## 📱 Testing Tips

### For Development:
1. **Use Your Own Number**: Test with your real phone
2. **Check Logs**: Monitor Supabase and Twilio logs
3. **Test Both**: Try signup and login flows
4. **Verify Costs**: Monitor SMS usage in provider dashboard

### For Production:
1. **Increase OTP Expiry**: 300 seconds recommended
2. **Set Up Monitoring**: Track OTP success rates
3. **Add Rate Limiting**: Prevent OTP spam
4. **Budget Alerts**: Set up billing alerts

## 🎯 Current Implementation

**Code Changes:**
- ✅ Removed mock OTP system
- ✅ Using real Supabase `signInWithOtp()`
- ✅ Using real Supabase `verifyOtp()`
- ✅ Added error logging
- ✅ Better error messages

**How It Works:**
1. User enters phone number
2. App calls `supabase.auth.signInWithOtp({ phone })`
3. Supabase sends OTP via configured provider
4. User receives SMS with OTP
5. User enters OTP
6. App calls `supabase.auth.verifyOtp({ phone, token })`
7. Supabase verifies OTP
8. User is authenticated!

## ✅ Verification Checklist

Before going live:
- [ ] Supabase Phone provider enabled
- [ ] SMS provider configured (Twilio/MessageBird)
- [ ] Test with real phone number
- [ ] OTP received successfully
- [ ] OTP verification works
- [ ] User can login/signup
- [ ] Billing alerts set up
- [ ] Rate limiting configured

## 🚀 Next Steps

1. **Configure Supabase** (15 minutes)
   - Enable Phone provider
   - Set up Twilio/MessageBird

2. **Test** (5 minutes)
   - Send OTP to your phone
   - Verify it works

3. **Deploy** (when ready)
   - Works automatically once configured

## 📞 Support

**Supabase Docs:**
- https://supabase.com/docs/guides/auth/phone-login

**Twilio Docs:**
- https://www.twilio.com/docs/verify/quickstarts

**MessageBird Docs:**
- https://developers.messagebird.com/

---

**Status**: ✅ Code Updated - Ready for Supabase Configuration
**Next**: Configure SMS provider in Supabase Dashboard
