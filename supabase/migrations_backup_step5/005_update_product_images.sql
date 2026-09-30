-- =====================================================
-- UPDATE PRODUCT IMAGES AND RENAME TONED MILK
-- Replace Unsplash URLs with local premium product images
-- Rename "Toned Milk" to "Organic Milk"
-- =====================================================

-- Update Buffalo Milk image
UPDATE public.products
SET image_url = '/images/buffalo-milk.jpg'
WHERE slug = 'buffalo-milk';

-- Update Cow Milk image
UPDATE public.products
SET image_url = '/images/cow-milk.jpg'
WHERE slug = 'cow-milk';

-- Update Toned Milk to Organic Milk (name, description, slug, and image)
UPDATE public.products
SET 
    name = 'Organic Milk',
    description = 'Pure organic milk from grass-fed cows, naturally healthy',
    slug = 'organic-milk',
    image_url = '/images/toned-milk.jpg',
    tags = ARRAY['milk', 'organic', 'natural', 'healthy']
WHERE slug = 'toned-milk';

-- Update Fresh Curd image
UPDATE public.products
SET image_url = '/images/curd.jpg'
WHERE slug = 'fresh-curd';

-- Update Pure Desi Ghee image
UPDATE public.products
SET image_url = '/images/ghee.jpg'
WHERE slug = 'pure-desi-ghee';

-- Update Fresh Paneer image
UPDATE public.products
SET image_url = '/images/paneer.jpg'
WHERE slug = 'fresh-paneer';

-- Update Masala Buttermilk image
UPDATE public.products
SET image_url = '/images/buttermilk.jpg'
WHERE slug = 'masala-buttermilk';

-- Update Sweet Lassi image
UPDATE public.products
SET image_url = '/images/lassi.jpg'
WHERE slug = 'sweet-lassi';

-- Verify the changes
SELECT name, slug, image_url FROM public.products ORDER BY category, name;
