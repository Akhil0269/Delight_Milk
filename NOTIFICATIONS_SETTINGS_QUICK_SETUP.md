# 🚀 Notifications & Settings - Quick Setup Guide

## ⚠️ Important: TypeScript Errors Expected

You will see TypeScript errors in the following files:
- `src/hooks/useNotifications.ts`
- `src/components/NotificationsDropdown.tsx`
- `src/pages/settings/NotificationPreferences.tsx`

**This is NORMAL and EXPECTED!** These errors occur because the database tables (`notifications` and `user_preferences`) don't exist yet in your Supabase project.

---

## 📝 Setup Steps (In Order)

### Step 1: Run Database Migrations

```bash
# Navigate to your project directory
cd "c:\Users\Asish\Downloads\Delight Milk-last\daily_drop\daily-drop-main"

# Run the migration
supabase db push
```

**Or** manually run these SQL files in Supabase Studio:
1. `supabase/migrations/006_notifications_system.sql`
2. The user_preferences table SQL (see below)

### Step 2: Create User Preferences Table

Run this SQL in Supabase Studio → SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    notification_preferences JSONB DEFAULT '{
        "order_notifications": true,
        "delivery_notifications": true,
        "payment_notifications": true,
        "subscription_notifications": true,
        "promotional_notifications": true,
        "email_notifications": true,
        "sms_notifications": false
    }'::jsonb,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
ON public.user_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.user_preferences FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Step 3: Regenerate Supabase Types

```bash
# This will update TypeScript types to include the new tables
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

**Or** if using remote:
```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Step 4: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

---

## ✅ After Setup - TypeScript Errors Will Disappear

Once you complete the above steps, all TypeScript errors will be resolved because:
1. The `notifications` table will exist in Supabase
2. The `user_preferences` table will exist in Supabase
3. The TypeScript types will be regenerated to include these tables
4. The hooks and components will have proper type definitions

---

## 🎨 Adding Components to Your Navigation

### Option 1: Add to DashboardHeader

If you have a `DashboardHeader.tsx` component:

```tsx
import NotificationsDropdown from "@/components/NotificationsDropdown";
import SettingsDropdown from "@/components/SettingsDropdown";

// In your header component:
<div className="flex items-center gap-2">
  <NotificationsDropdown />
  <SettingsDropdown />
  <UserProfileAvatar />
</div>
```

### Option 2: Create a New Navigation Component

Create `src/components/TopNavigation.tsx`:

```tsx
import NotificationsDropdown from "./NotificationsDropdown";
import SettingsDropdown from "./SettingsDropdown";
import UserProfileAvatar from "./UserProfileAvatar";

const TopNavigation = () => {
  return (
    <div className="flex items-center gap-3">
      <NotificationsDropdown />
      <SettingsDropdown />
      <UserProfileAvatar />
    </div>
  );
};

export default TopNavigation;
```

Then use it in your header/navigation.

---

## 🧪 Testing the System

### 1. Create a Test Notification

Run this SQL in Supabase Studio:

```sql
-- Replace 'YOUR_USER_ID' with your actual user ID
INSERT INTO public.notifications (
  user_id,
  type,
  title,
  message,
  action_url
) VALUES (
  'YOUR_USER_ID',
  'order_placed',
  'Welcome to Notifications!',
  'This is your first notification. Click to test navigation.',
  '/dashboard'
);
```

### 2. Check Unread Count

```sql
SELECT get_unread_notification_count('YOUR_USER_ID');
```

### 3. Test in Browser

1. Open your app: `http://localhost:8080/dashboard`
2. Look for the bell icon (🔔) in the navigation
3. You should see a red badge with "1"
4. Click the bell icon to open the dropdown
5. Click the notification to test navigation

---

## 📂 Files Created

### Database
- ✅ `supabase/migrations/006_notifications_system.sql`

### Hooks
- ✅ `src/hooks/useNotifications.ts`

### Components
- ✅ `src/components/NotificationsDropdown.tsx`
- ✅ `src/components/SettingsDropdown.tsx`

### Pages
- ✅ `src/pages/settings/NotificationPreferences.tsx`

### Routes
- ✅ Added to `src/App.tsx`

### Documentation
- ✅ `NOTIFICATIONS_SETTINGS_GUIDE.md`
- ✅ `NOTIFICATIONS_SETTINGS_QUICK_SETUP.md` (this file)

---

## 🔧 Troubleshooting

### TypeScript errors won't go away?

1. Make sure migrations ran successfully
2. Regenerate types: `supabase gen types typescript --local`
3. Restart TypeScript server in VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
4. Restart dev server

### Notifications not appearing?

1. Check if tables exist in Supabase Studio
2. Verify RLS policies are enabled
3. Check browser console for errors
4. Verify user is authenticated

### Settings dropdown not working?

1. Check if user is authenticated (`useAuth` hook)
2. Verify routes are added to `App.tsx`
3. Check browser console for navigation errors

---

## 🎯 Next Steps

After setup is complete:

1. **Integrate with existing features**:
   - Add notification creation to order system
   - Add notification creation to delivery system
   - Add notification creation to payment system

2. **Customize notification types**:
   - Add more notification types as needed
   - Customize icons and colors
   - Add custom actions

3. **Implement remaining settings pages**:
   - Subscription Settings
   - Payment Methods
   - Language Preference

4. **Add real-time features**:
   - Web push notifications
   - Email notifications
   - SMS notifications

---

## 📞 Need Help?

If you encounter issues:

1. Check the main guide: `NOTIFICATIONS_SETTINGS_GUIDE.md`
2. Verify all migrations ran successfully
3. Check Supabase Studio for table structure
4. Look at browser console for errors
5. Check network tab for API calls

---

**Status**: ✅ Ready to Setup  
**Estimated Setup Time**: 5-10 minutes  
**Difficulty**: Easy

Once setup is complete, you'll have a fully functional notification and settings system! 🎉
