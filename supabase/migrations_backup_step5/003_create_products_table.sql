-- =====================================================
-- PRODUCTS TABLE SCHEMA
-- Dairy products catalog with pricing, ratings, and stock
-- =====================================================

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
    -- Pricing (stored in paise/smallest unit for precision)
    price_per_unit DECIMAL(10, 2) NOT NULL CHECK (price_per_unit >= 0),
    unit VARCHAR(50) NOT NULL, -- 'L', 'kg', 'g', 'ml', 'piece'
    
    -- Media
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
    
    -- Rating & Reviews
    rating DECIMAL(2, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    
    -- Stock Management
    stock_status VARCHAR(50) DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued')),
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INTEGER DEFAULT 10,
    
    -- Additional Info
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    -- SEO & Metadata
    slug VARCHAR(255) UNIQUE,
    meta_description TEXT,
    tags TEXT[], -- Array of tags for search
    
    -- Nutritional Info (optional)
    nutritional_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT products_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT products_category_not_empty CHECK (LENGTH(TRIM(category)) > 0)
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON public.products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON public.products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING gin(tags);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view active products (public read)
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);

-- Policy 2: Authenticated users can view all products
CREATE POLICY "Authenticated users can view all products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Only admins can insert products
CREATE POLICY "Only admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM public.admin_users WHERE is_active = true
    )
);

-- Policy 4: Only admins can update products
CREATE POLICY "Only admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
    auth.uid() IN (
        SELECT user_id FROM public.admin_users WHERE is_active = true
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM public.admin_users WHERE is_active = true
    )
);

-- Policy 5: Only admins can delete products
CREATE POLICY "Only admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT user_id FROM public.admin_users WHERE is_active = true
    )
);

-- =====================================================
-- SAMPLE DATA
-- Insert initial dairy products
-- =====================================================

INSERT INTO public.products (name, description, category, price_per_unit, unit, image_url, rating, review_count, stock_status, stock_quantity, is_featured, is_active, slug, tags) VALUES
-- Buffalo Milk
('Buffalo Milk', 'Fresh farm buffalo milk, rich in protein and calcium. Perfect for tea, coffee, and cooking.', 'Milk', 100.00, 'L', '/images/buffalo-milk.jpg', 4.5, 234, 'in_stock', 150, true, true, 'buffalo-milk', ARRAY['milk', 'buffalo', 'dairy', 'fresh']),

-- Cow Milk
('Cow Milk', 'Pure and fresh cow milk, ideal for daily consumption. Light and nutritious.', 'Milk', 70.00, 'L', '/images/cow-milk.jpg', 4.7, 456, 'in_stock', 200, true, true, 'cow-milk', ARRAY['milk', 'cow', 'dairy', 'fresh']),

-- Organic Milk
('Organic Milk', 'Pure organic milk from grass-fed cows, naturally healthy', 'Milk', 60.00, 'L', '/images/toned-milk.jpg', 4.3, 123, 'in_stock', 100, false, true, 'organic-milk', ARRAY['milk', 'organic', 'natural', 'healthy']),

-- Curd
('Fresh Curd', 'Creamy homemade-style curd. Rich in probiotics and perfect for digestion.', 'Curd', 150.00, 'kg', '/images/curd.jpg', 4.6, 189, 'in_stock', 80, true, true, 'fresh-curd', ARRAY['curd', 'yogurt', 'probiotic', 'fresh']),

-- Ghee
('Pure Desi Ghee', 'Traditional hand-churned ghee made from pure butter. Rich aroma and taste.', 'Ghee', 999.00, 'kg', '/images/ghee.jpg', 4.9, 567, 'in_stock', 50, true, true, 'pure-desi-ghee', ARRAY['ghee', 'clarified butter', 'traditional', 'organic']),

-- Paneer
('Fresh Paneer', 'Soft and fresh paneer made daily. Perfect for curries and snacks.', 'Paneer', 350.00, 'kg', '/images/paneer.jpg', 4.4, 234, 'in_stock', 60, false, true, 'fresh-paneer', ARRAY['paneer', 'cottage cheese', 'protein', 'fresh']),

-- Buttermilk
('Masala Buttermilk', 'Refreshing spiced buttermilk, perfect for summer. Rich in probiotics.', 'Buttermilk', 30.00, 'L', '/images/buttermilk.jpg', 4.2, 89, 'in_stock', 120, false, true, 'masala-buttermilk', ARRAY['buttermilk', 'chaas', 'probiotic', 'refreshing']),

-- Lassi
('Sweet Lassi', 'Traditional sweet lassi made with fresh curd and sugar. Delicious and nutritious.', 'Lassi', 40.00, 'L', '/images/lassi.jpg', 4.5, 156, 'in_stock', 90, false, true, 'sweet-lassi', ARRAY['lassi', 'yogurt drink', 'sweet', 'traditional'])

ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- HELPER FUNCTION: Get products by category
-- =====================================================

CREATE OR REPLACE FUNCTION get_products_by_category(category_name VARCHAR)
RETURNS SETOF public.products AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.products
    WHERE category = category_name
    AND is_active = true
    ORDER BY display_order, name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Search products
-- =====================================================

CREATE OR REPLACE FUNCTION search_products(search_term VARCHAR)
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
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADMIN USERS TABLE (for RLS policies)
-- Only needed if not already exists
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can see admin list
CREATE POLICY "Only admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
);

COMMENT ON TABLE public.products IS 'Products catalog for the dairy delivery platform';
COMMENT ON COLUMN public.products.price_per_unit IS 'Price in rupees per unit (L, kg, etc.)';
COMMENT ON COLUMN public.products.stock_status IS 'Current stock availability status';
COMMENT ON COLUMN public.products.rating IS 'Average customer rating (0-5)';
COMMENT ON COLUMN public.products.review_count IS 'Total number of customer reviews';
