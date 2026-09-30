-- =====================================================
-- 004_update_product_images.sql
-- Delight Milk: Local Product Image Asset Paths
-- =====================================================

-- Idempotently update product image URLs to local assets
UPDATE public.products
SET image_url = '/images/buffalo-milk.jpg'
WHERE slug = 'buffalo-milk';

UPDATE public.products
SET image_url = '/images/cow-milk.jpg'
WHERE slug = 'cow-milk';

UPDATE public.products
SET image_url = '/images/toned-milk.jpg'
WHERE slug = 'toned-milk';

UPDATE public.products
SET image_url = '/images/toned-milk.jpg'
WHERE slug = 'organic-milk' AND (image_url IS NULL OR image_url LIKE 'http%');

UPDATE public.products
SET image_url = '/images/curd.jpg'
WHERE slug = 'fresh-curd';

UPDATE public.products
SET image_url = '/images/ghee.jpg'
WHERE slug = 'pure-desi-ghee';

UPDATE public.products
SET image_url = '/images/paneer.jpg'
WHERE slug = 'fresh-paneer';

UPDATE public.products
SET image_url = '/images/butter.jpg'
WHERE slug = 'pure-butter';

UPDATE public.products
SET image_url = '/images/buttermilk.jpg'
WHERE slug = 'masala-buttermilk';

UPDATE public.products
SET image_url = '/images/lassi.jpg'
WHERE slug = 'sweet-lassi';
