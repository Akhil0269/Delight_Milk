-- =====================================================
-- supabase/seed.sql
-- Delight Milk: Safe Development Seed Data
-- =====================================================

-- Note: User authentication is managed by Supabase Auth (auth.users).
-- To grant admin access to an existing signed-up user in local development, run:
--
--   SELECT public.promote_user_to_admin('your-email@example.com');
--
-- Or via SQL query directly:
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'your-email@example.com'
--   ON CONFLICT (user_id, role) DO NOTHING;

-- 1. Ensure Standard Product Catalog Exists
INSERT INTO public.products (name, description, category, unit, price_per_unit, image_url, rating, review_count, stock_status, stock_quantity, is_featured, is_active, slug, tags)
VALUES
('Cow Milk', 'Pure and fresh cow milk, ideal for daily consumption. Light and nutritious.', 'Milk', 'L', 60.00, '/images/cow-milk.jpg', 4.7, 456, 'in_stock', 200, true, true, 'cow-milk', ARRAY['milk', 'cow', 'dairy', 'fresh']),
('Buffalo Milk', 'Fresh farm buffalo milk, rich in protein and calcium. Perfect for tea, coffee, and cooking.', 'Milk', 'L', 70.00, '/images/buffalo-milk.jpg', 4.5, 234, 'in_stock', 150, true, true, 'buffalo-milk', ARRAY['milk', 'buffalo', 'dairy', 'fresh']),
('Organic Milk', 'Pure organic milk from grass-fed cows, naturally healthy', 'Milk', 'L', 90.00, '/images/toned-milk.jpg', 4.8, 123, 'in_stock', 80, false, true, 'organic-milk', ARRAY['milk', 'organic', 'natural', 'healthy']),
('Fresh Curd', 'Creamy homemade-style curd. Rich in probiotics and perfect for digestion.', 'Curd', 'kg', 80.00, '/images/curd.jpg', 4.6, 189, 'in_stock', 80, true, true, 'fresh-curd', ARRAY['curd', 'yogurt', 'probiotic', 'fresh']),
('Paneer', 'Soft and fresh paneer made daily. Perfect for curries and snacks.', 'Paneer', 'kg', 320.00, '/images/paneer.jpg', 4.4, 234, 'in_stock', 60, false, true, 'fresh-paneer', ARRAY['paneer', 'cottage cheese', 'protein', 'fresh']),
('Butter', 'Farm fresh butter churned from pure cream.', 'Butter', 'kg', 480.00, '/images/butter.jpg', 4.7, 312, 'in_stock', 50, false, true, 'pure-butter', ARRAY['butter', 'dairy', 'fresh', 'cream']),
('Ghee', 'Traditional hand-churned desi ghee made from pure butter. Rich aroma and taste.', 'Ghee', 'kg', 600.00, '/images/ghee.jpg', 4.9, 567, 'in_stock', 50, true, true, 'pure-desi-ghee', ARRAY['ghee', 'clarified butter', 'traditional', 'organic']),
('Masala Buttermilk', 'Refreshing spiced buttermilk, perfect for summer. Rich in probiotics.', 'Buttermilk', 'L', 30.00, '/images/buttermilk.jpg', 4.2, 89, 'in_stock', 120, false, true, 'masala-buttermilk', ARRAY['buttermilk', 'chaas', 'probiotic', 'refreshing']),
('Sweet Lassi', 'Traditional sweet lassi made with fresh curd and sugar. Delicious and nutritious.', 'Lassi', 'L', 40.00, '/images/lassi.jpg', 4.5, 156, 'in_stock', 90, false, true, 'sweet-lassi', ARRAY['lassi', 'yogurt drink', 'sweet', 'traditional'])
ON CONFLICT (slug) DO UPDATE SET
    price_per_unit = EXCLUDED.price_per_unit,
    image_url = EXCLUDED.image_url,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    stock_status = EXCLUDED.stock_status,
    tags = EXCLUDED.tags,
    updated_at = now();

-- 2. Bootstrap Admin Promotion for Authorized Emails (If account was pre-registered in auth.users)
DO $$
DECLARE
    v_admin_email TEXT;
    v_admin_emails TEXT[] := ARRAY['admin@dailydrop.com', 'yaswanthvenkata245@gmail.com'];
BEGIN
    FOREACH v_admin_email IN ARRAY v_admin_emails
    LOOP
        PERFORM public.promote_user_to_admin(v_admin_email);
    END LOOP;
END $$;
