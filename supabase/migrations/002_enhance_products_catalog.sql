-- =====================================================
-- 002_enhance_products_catalog.sql
-- Delight Milk: Rich Catalog Fields, Search & Tagging
-- =====================================================

-- 1. Extend products Table with Rich Catalog Fields
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rating DECIMAL(2, 1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50) DEFAULT 'in_stock',
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS nutritional_info JSONB,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Add Constraints Safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_rating_check'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT products_rating_check CHECK (rating >= 0 AND rating <= 5);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_review_count_check'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT products_review_count_check CHECK (review_count >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_quantity_check'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT products_stock_quantity_check CHECK (stock_quantity >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_status_check'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT products_stock_status_check CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_slug_key'
    ) THEN
        ALTER TABLE public.products ADD CONSTRAINT products_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 3. Create Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON public.products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON public.products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING gin(tags);

-- 4. Canonical RLS Policies (Using has_role instead of admin_users)
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;

CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can view all products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Helper Function: Get Products by Category
CREATE OR REPLACE FUNCTION public.get_products_by_category(category_name VARCHAR)
RETURNS SETOF public.products AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.products
    WHERE category = category_name
    AND is_active = true
    ORDER BY display_order, name;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Helper Function: Search Products
CREATE OR REPLACE FUNCTION public.search_products(search_term VARCHAR)
RETURNS SETOF public.products AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.products
    WHERE is_active = true
    AND (
        name ILIKE '%' || search_term || '%'
        OR description ILIKE '%' || search_term || '%'
        OR category ILIKE '%' || search_term || '%'
        OR search_term = ANY(tags)
    )
    ORDER BY 
        CASE WHEN name ILIKE search_term || '%' THEN 1
             WHEN name ILIKE '%' || search_term || '%' THEN 2
             ELSE 3
        END,
        rating DESC,
        name;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Populate Existing Products with Rich Metadata
UPDATE public.products SET
    slug = 'cow-milk',
    rating = 4.7,
    review_count = 456,
    stock_status = 'in_stock',
    stock_quantity = 200,
    is_featured = true,
    tags = ARRAY['milk', 'cow', 'dairy', 'fresh']
WHERE name = 'Cow Milk' AND slug IS NULL;

UPDATE public.products SET
    slug = 'buffalo-milk',
    rating = 4.5,
    review_count = 234,
    stock_status = 'in_stock',
    stock_quantity = 150,
    is_featured = true,
    tags = ARRAY['milk', 'buffalo', 'dairy', 'fresh']
WHERE name = 'Buffalo Milk' AND slug IS NULL;

UPDATE public.products SET
    slug = 'toned-milk',
    rating = 4.3,
    review_count = 89,
    stock_status = 'in_stock',
    stock_quantity = 100,
    tags = ARRAY['milk', 'toned', 'low-fat', 'dairy']
WHERE name = 'Toned Milk' AND slug IS NULL;

UPDATE public.products SET
    slug = 'organic-milk',
    rating = 4.8,
    review_count = 123,
    stock_status = 'in_stock',
    stock_quantity = 80,
    tags = ARRAY['milk', 'organic', 'natural', 'healthy']
WHERE name = 'Organic Milk' AND slug IS NULL;

UPDATE public.products SET
    slug = 'fresh-curd',
    rating = 4.6,
    review_count = 189,
    stock_status = 'in_stock',
    stock_quantity = 80,
    is_featured = true,
    tags = ARRAY['curd', 'yogurt', 'probiotic', 'fresh']
WHERE name = 'Fresh Curd' AND slug IS NULL;

UPDATE public.products SET
    slug = 'fresh-paneer',
    rating = 4.4,
    review_count = 234,
    stock_status = 'in_stock',
    stock_quantity = 60,
    tags = ARRAY['paneer', 'cottage cheese', 'protein', 'fresh']
WHERE name = 'Paneer' AND slug IS NULL;

UPDATE public.products SET
    slug = 'pure-butter',
    rating = 4.7,
    review_count = 312,
    stock_status = 'in_stock',
    stock_quantity = 50,
    tags = ARRAY['butter', 'dairy', 'fresh', 'cream']
WHERE name = 'Butter' AND slug IS NULL;

UPDATE public.products SET
    slug = 'pure-desi-ghee',
    rating = 4.9,
    review_count = 567,
    stock_status = 'in_stock',
    stock_quantity = 50,
    is_featured = true,
    tags = ARRAY['ghee', 'clarified butter', 'traditional', 'organic']
WHERE name = 'Ghee' AND slug IS NULL;

-- Insert additional catalog items if not present
INSERT INTO public.products (name, description, category, price_per_unit, unit, image_url, rating, review_count, stock_status, stock_quantity, is_featured, is_active, slug, tags)
VALUES 
('Masala Buttermilk', 'Refreshing spiced buttermilk, perfect for summer. Rich in probiotics.', 'Buttermilk', 30.00, 'L', '/images/buttermilk.jpg', 4.2, 89, 'in_stock', 120, false, true, 'masala-buttermilk', ARRAY['buttermilk', 'chaas', 'probiotic', 'refreshing']),
('Sweet Lassi', 'Traditional sweet lassi made with fresh curd and sugar. Delicious and nutritious.', 'Lassi', 40.00, 'L', '/images/lassi.jpg', 4.5, 156, 'in_stock', 90, false, true, 'sweet-lassi', ARRAY['lassi', 'yogurt drink', 'sweet', 'traditional'])
ON CONFLICT (slug) DO NOTHING;
