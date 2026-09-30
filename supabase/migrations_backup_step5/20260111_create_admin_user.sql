-- Admin User Setup Script
-- Run this in Supabase SQL Editor to create your first admin user

-- Step 1: First, make sure the admin system migration has been run
-- (The migration file: 20260111_admin_system.sql)

-- Step 2: Create admin user or update existing user to admin
-- Replace 'admin@dailydrop.com' with your actual admin email

-- Option A: If user already exists, make them admin
UPDATE profiles 
SET 
  role = 'admin',
  is_blocked = false
WHERE email = 'admin@dailydrop.com';

-- Option B: If you need to create a new admin user
-- First, sign up through the normal auth flow at /auth
-- Then run the UPDATE query above to make them admin

-- Step 3: Verify admin user was created
SELECT 
  id,
  email,
  full_name,
  role,
  is_blocked,
  created_at
FROM profiles
WHERE role = 'admin';

-- Step 4: Create a test admin user (optional)
-- Note: You'll need to set a password through Supabase Auth UI
-- This just creates the profile entry

-- Example: Creating admin profile for existing auth user
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE user_id = 'YOUR_AUTH_USER_ID_HERE';

-- Step 5: Grant admin access to specific email
-- Run this after the user signs up normally
DO $$
DECLARE
  admin_email TEXT := 'admin@dailydrop.com'; -- Change this to your admin email
  user_profile RECORD;
BEGIN
  -- Find the profile by email
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE email = admin_email;
  
  IF FOUND THEN
    -- Update to admin
    UPDATE profiles 
    SET role = 'admin', is_blocked = false 
    WHERE id = user_profile.id;
    
    RAISE NOTICE 'User % is now an admin', admin_email;
  ELSE
    RAISE NOTICE 'User % not found. Please sign up first at /auth', admin_email;
  END IF;
END $$;

-- Step 6: Create multiple admin users
-- Add more admin emails here
DO $$
DECLARE
  admin_emails TEXT[] := ARRAY['admin@dailydrop.com', 'manager@dailydrop.com'];
  admin_email TEXT;
BEGIN
  FOREACH admin_email IN ARRAY admin_emails
  LOOP
    UPDATE profiles 
    SET role = 'admin', is_blocked = false 
    WHERE email = admin_email;
    
    IF FOUND THEN
      RAISE NOTICE 'User % is now an admin', admin_email;
    ELSE
      RAISE NOTICE 'User % not found', admin_email;
    END IF;
  END LOOP;
END $$;

-- Step 7: Verify admin permissions
-- Check if admin can access admin functions
SELECT is_admin(id) as has_admin_access, email, role
FROM profiles
WHERE role = 'admin';

-- Step 8: View all admin users
SELECT 
  id,
  email,
  full_name,
  role,
  phone,
  is_blocked,
  created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

-- IMPORTANT NOTES:
-- 1. Users must sign up through /auth first
-- 2. Then run UPDATE query to make them admin
-- 3. Admin panel is at /admin route
-- 4. Only users with role='admin' can access admin features
