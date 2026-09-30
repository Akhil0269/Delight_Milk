# Admin Setup Guide

## Quick Start - Create Your First Admin User

### Step 1: Run Database Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the main admin migration:
   - File: `supabase/migrations/20260111_admin_system.sql`
   - This creates all admin tables and security policies

### Step 2: Create Admin User

**Option A: Make Existing User Admin**

1. Sign up normally at `/auth`
2. In Supabase SQL Editor, run:
```sql
UPDATE profiles 
SET role = 'admin', is_blocked = false 
WHERE email = 'your-email@example.com';
```

**Option B: Use Admin Signup**

1. Go to `/admin/auth`
2. Click "Need an admin account? Sign up"
3. Fill in details and create account
4. Run the SQL query above to grant admin role

### Step 3: Login as Admin

1. Go to `/admin/auth`
2. Enter your email and password
3. Click "Sign In"
4. You'll be redirected to `/admin` dashboard

### Step 4: Verify Admin Access

```sql
-- Check admin users
SELECT id, email, full_name, role, is_blocked 
FROM profiles 
WHERE role = 'admin';
```

## Admin Routes

- `/admin/auth` - Admin login/signup
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/products` - Product management
- `/admin/deliveries` - Delivery management
- `/admin/wallet` - Wallet management

## Default Admin Credentials

For testing, you can create an admin with:
- Email: `admin@dailydrop.com`
- Password: (set during signup)

Then run:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@dailydrop.com';
```

## Security Notes

- Only users with `role = 'admin'` can access admin panel
- Blocked admins cannot login
- All admin actions are logged in `admin_logs` table
- RLS policies protect all data

## Troubleshooting

**Can't access admin panel?**
- Verify role is set to 'admin' in database
- Check is_blocked is false
- Clear browser cache and re-login

**Database errors?**
- Make sure migration ran successfully
- Check Supabase logs for errors
- Verify all tables were created

## Next Steps

1. Create your admin account
2. Login at `/admin/auth`
3. Start managing users, products, and deliveries!
