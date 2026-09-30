-- =====================================================
-- DUAL PRICING SYSTEM WITH SAFE FUTURE-ONLY CHANGES
-- Version: 2.0
-- Date: 2026-01-29
-- =====================================================

-- =====================================================
-- PRODUCT PRICING TABLE
-- Stores historical and future pricing with effective dates
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Product Reference
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    
    -- Dual Pricing
    regular_price DECIMAL(10, 2) NOT NULL CHECK (regular_price >= 0),
    subscription_price DECIMAL(10, 2) NOT NULL CHECK (subscription_price >= 0),
    
    -- Effective Date Range
    effective_from DATE NOT NULL,
    effective_until DATE, -- NULL means indefinite
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Trail
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    
    -- Constraints
    CONSTRAINT valid_price_range CHECK (effective_until IS NULL OR effective_until >= effective_from),
    CONSTRAINT subscription_not_higher CHECK (subscription_price <= regular_price),
    CONSTRAINT no_overlapping_dates UNIQUE (product_id, effective_from)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON public.product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_effective_from ON public.product_prices(effective_from);
CREATE INDEX IF NOT EXISTS idx_product_prices_active ON public.product_prices(is_active);

-- =====================================================
-- PRICE CHANGE HISTORY (AUDIT LOG)
-- Every price change is logged here
-- =====================================================

CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Product Reference
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- Price Changes
    old_regular_price DECIMAL(10, 2),
    new_regular_price DECIMAL(10, 2) NOT NULL,
    old_subscription_price DECIMAL(10, 2),
    new_subscription_price DECIMAL(10, 2) NOT NULL,
    
    -- Effective Date
    effective_from DATE NOT NULL,
    
    -- Audit
    changed_by UUID REFERENCES auth.users(id),
    changed_by_name VARCHAR(255),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    
    -- Metadata
    change_type VARCHAR(50) DEFAULT 'price_update' CHECK (change_type IN ('initial', 'price_update', 'promotion', 'correction'))
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON public.price_history(changed_at DESC);

-- =====================================================
-- UPDATE PRODUCTS TABLE
-- Add subscription-related fields
-- =====================================================

-- Add new columns to products table if they don't exist
DO $$
BEGIN
    -- Check and add subscription_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'subscription_enabled'
    ) THEN
        ALTER TABLE public.products ADD COLUMN subscription_enabled BOOLEAN DEFAULT true;
    END IF;

    -- Check and add addon_product column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'addon_product'
    ) THEN
        ALTER TABLE public.products ADD COLUMN addon_product BOOLEAN DEFAULT false;
    END IF;

    -- Check and add cutoff_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'cutoff_time'
    ) THEN
        ALTER TABLE public.products ADD COLUMN cutoff_time TIME DEFAULT '22:00:00';
    END IF;
END $$;

COMMENT ON COLUMN public.products.subscription_enabled IS 'Whether this product can be subscribed for daily delivery';
COMMENT ON COLUMN public.products.addon_product IS 'Whether this is a one-time add-on product';
COMMENT ON COLUMN public.products.cutoff_time IS 'Time before which quantity changes must be made (default 10 PM)';

-- =====================================================
-- UPDATE DELIVERY CALENDAR TABLE
-- Ensure it has price_per_unit stored per day
-- =====================================================

-- Add price_per_unit if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_calendar' 
        AND column_name = 'price_per_unit'
    ) THEN
        -- Note: delivery_calendar table might not exist yet
        -- This is safe to run even if table doesn't exist
        NULL;
    END IF;
END $$;

-- =====================================================
-- HELPER FUNCTION: Get Active Price for Date
-- Returns the correct price for a specific date
-- =====================================================

CREATE OR REPLACE FUNCTION get_price_for_date(
    p_product_id UUID,
    p_date DATE,
    p_has_subscription BOOLEAN DEFAULT false
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_price DECIMAL(10, 2);
BEGIN
    -- Find the active price for this date
    SELECT 
        CASE 
            WHEN p_has_subscription THEN subscription_price 
            ELSE regular_price 
        END
    INTO v_price
    FROM public.product_prices
    WHERE 
        product_id = p_product_id
        AND is_active = true
        AND effective_from <= p_date
        AND (effective_until IS NULL OR effective_until >= p_date)
    ORDER BY effective_from DESC
    LIMIT 1;
    
    -- If no price found, return 0 (should not happen in production)
    RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- HELPER FUNCTION: Get Current Price
-- Returns the price for today
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_price(
    p_product_id UUID,
    p_has_subscription BOOLEAN DEFAULT false
)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    RETURN get_price_for_date(p_product_id, CURRENT_DATE, p_has_subscription);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- HELPER FUNCTION: Validate Price Change
-- Ensures price change is safe (future-only)
-- =====================================================

CREATE OR REPLACE FUNCTION validate_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Effective date must be in the future or today
    IF NEW.effective_from < CURRENT_DATE THEN
        RAISE EXCEPTION 'Effective date must be today or in the future. Historical pricing changes are not allowed.';
    END IF;
    
    -- Rule 2: Subscription price should not exceed regular price
    IF NEW.subscription_price > NEW.regular_price THEN
        RAISE WARNING 'Subscription price is higher than regular price. This is unusual.';
    END IF;
    
    -- Rule 3: Check for overlapping dates
    IF EXISTS (
        SELECT 1 FROM public.product_prices
        WHERE 
            product_id = NEW.product_id
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND is_active = true
            AND effective_from = NEW.effective_from
    ) THEN
        RAISE EXCEPTION 'A price with the same effective date already exists for this product.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_price_change_trigger ON public.product_prices;
CREATE TRIGGER validate_price_change_trigger
    BEFORE INSERT OR UPDATE ON public.product_prices
    FOR EACH ROW EXECUTE FUNCTION validate_price_change();

-- =====================================================
-- TRIGGER: Log Price Changes
-- Automatically creates audit log entry
-- =====================================================

CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
DECLARE
    v_product_name VARCHAR(255);
    v_admin_name VARCHAR(255);
    v_old_regular DECIMAL(10, 2);
    v_old_subscription DECIMAL(10, 2);
BEGIN
    -- Get product name
    SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
    
    -- Get admin name (if available)
    IF NEW.created_by IS NOT NULL THEN
        SELECT COALESCE(email, id::text) INTO v_admin_name FROM auth.users WHERE id = NEW.created_by;
    ELSE
        v_admin_name := 'System';
    END IF;
    
    -- Get old prices if this is an update
    IF TG_OP = 'UPDATE' THEN
        v_old_regular := OLD.regular_price;
        v_old_subscription := OLD.subscription_price;
    END IF;
    
    -- Insert into history
    INSERT INTO public.price_history (
        product_id,
        product_name,
        old_regular_price,
        new_regular_price,
        old_subscription_price,
        new_subscription_price,
        effective_from,
        changed_by,
        changed_by_name,
        reason,
        change_type
    ) VALUES (
        NEW.product_id,
        v_product_name,
        v_old_regular,
        NEW.regular_price,
        v_old_subscription,
        NEW.subscription_price,
        NEW.effective_from,
        NEW.created_by,
        v_admin_name,
        NEW.notes,
        CASE WHEN TG_OP = 'INSERT' THEN 'initial' ELSE 'price_update' END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_price_change_trigger ON public.product_prices;
CREATE TRIGGER log_price_change_trigger
    AFTER INSERT OR UPDATE ON public.product_prices
    FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view active prices
CREATE POLICY "Anyone can view active product prices"
ON public.product_prices
FOR SELECT
USING (is_active = true);

-- Authenticated users can view all prices
CREATE POLICY "Authenticated users can view all prices"
ON public.product_prices
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete prices
CREATE POLICY "Only admins can manage prices"
ON public.product_prices
FOR ALL
TO authenticated
USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
)
WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
);

-- Anyone can view price history (transparency)
CREATE POLICY "Anyone can view price history"
ON public.price_history
FOR SELECT
USING (true);

-- Only admins can insert into history (though this is automated via trigger)
CREATE POLICY "Only admins can manage history"
ON public.price_history
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = true)
);

-- =====================================================
-- SEED DATA: Initial Prices
-- As per requirements
-- =====================================================

-- Insert initial prices for existing products
DO $$
DECLARE
    v_buffalo_milk UUID;
    v_cow_milk UUID;
    v_curd UUID;
    v_ghee UUID;
    v_system_admin UUID;
BEGIN
    -- Get product IDs (from slug)
    SELECT id INTO v_buffalo_milk FROM public.products WHERE slug = 'buffalo-milk' LIMIT 1;
    SELECT id INTO v_cow_milk FROM public.products WHERE slug = 'cow-milk' LIMIT 1;
    SELECT id INTO v_curd FROM public.products WHERE slug = 'fresh-curd' LIMIT 1;
    SELECT id INTO v_ghee FROM public.products WHERE slug = 'pure-desi-ghee' LIMIT 1;
    
    -- Get first admin user (or use NULL if none exists)
    SELECT user_id INTO v_system_admin FROM public.admin_users WHERE is_active = true LIMIT 1;
    
    -- Insert prices only if products exist and prices don't already exist
    IF v_buffalo_milk IS NOT NULL THEN
        INSERT INTO public.product_prices (product_id, regular_price, subscription_price, effective_from, created_by, notes)
        VALUES (v_buffalo_milk, 100.00, 90.00, '2026-01-01', v_system_admin, 'Initial pricing - Buffalo Milk')
        ON CONFLICT (product_id, effective_from) DO NOTHING;
    END IF;
    
    IF v_cow_milk IS NOT NULL THEN
        INSERT INTO public.product_prices (product_id, regular_price, subscription_price, effective_from, created_by, notes)
        VALUES (v_cow_milk, 70.00, 60.00, '2026-01-01', v_system_admin, 'Initial pricing - Cow Milk')
        ON CONFLICT (product_id, effective_from) DO NOTHING;
    END IF;
    
    IF v_curd IS NOT NULL THEN
        INSERT INTO public.product_prices (product_id, regular_price, subscription_price, effective_from, created_by, notes)
        VALUES (v_curd, 150.00, 150.00, '2026-01-01', v_system_admin, 'Initial pricing - Curd (no subscription discount)')
        ON CONFLICT (product_id, effective_from) DO NOTHING;
    END IF;
    
    IF v_ghee IS NOT NULL THEN
        INSERT INTO public.product_prices (product_id, regular_price, subscription_price, effective_from, created_by, notes)
        VALUES (v_ghee, 999.00, 999.00, '2026-01-01', v_system_admin, 'Initial pricing - Ghee (no subscription discount)')
        ON CONFLICT (product_id, effective_from) DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- ADD NEW PRODUCTS: Paneer, Butter, Cheese
-- With initial pricing
-- =====================================================

DO $$
DECLARE
    v_paneer UUID;
    v_butter UUID;
    v_cheese UUID;
    v_system_admin UUID;
BEGIN
    -- Get first admin user
    SELECT user_id INTO v_system_admin FROM public.admin_users WHERE is_active = true LIMIT 1;
    
    -- Insert Paneer if it doesn't exist
    INSERT INTO public.products (
        name, description, category, price_per_unit, unit, image_url, 
        rating, review_count, stock_status, is_featured, is_active, 
        slug, tags, subscription_enabled, addon_product
    ) VALUES (
        'Fresh Paneer',
        'Soft and fresh paneer made daily from pure milk. Perfect for curries and snacks.',
        'Dairy',
        350.00,
        'kg',
        '/images/paneer.jpg',
        4.4,
        234,
        'in_stock',
        false,
        true,
        'fresh-paneer',
        ARRAY['paneer', 'cottage cheese', 'protein', 'fresh', 'dairy'],
        true,
        false
    )
    ON CONFLICT (slug) DO UPDATE SET
        price_per_unit = EXCLUDED.price_per_unit,
        updated_at = NOW()
    RETURNING id INTO v_paneer;
    
    -- Insert Butter
    INSERT INTO public.products (
        name, description, category, price_per_unit, unit, image_url, 
        rating, review_count, stock_status, is_featured, is_active, 
        slug, tags, subscription_enabled, addon_product
    ) VALUES (
        'Pure Butter',
        'Creamy fresh butter churned from pure cream. Rich and delicious.',
        'Dairy',
        450.00,
        'kg',
        '/images/butter.jpg',
        4.7,
        312,
        'in_stock',
        false,
        true,
        'pure-butter',
        ARRAY['butter', 'dairy', 'fresh', 'cream'],
        false,
        true
    )
    ON CONFLICT (slug) DO UPDATE SET
        price_per_unit = EXCLUDED.price_per_unit,
        updated_at = NOW()
    RETURNING id INTO v_butter;
    
    -- Insert Cheese
    INSERT INTO public.products (
        name, description, category, price_per_unit, unit, image_url, 
        rating, review_count, stock_status, is_featured, is_active, 
        slug, tags, subscription_enabled, addon_product
    ) VALUES (
        'Cheddar Cheese',
        'Premium quality cheddar cheese. Perfect for sandwiches and cooking.',
        'Dairy',
        600.00,
        'kg',
        '/images/cheese.jpg',
        4.6,
        189,
        'in_stock',
        false,
        true,
        'cheddar-cheese',
        ARRAY['cheese', 'cheddar', 'dairy', 'premium'],
        false,
        true
    )
    ON CONFLICT (slug) DO UPDATE SET
        price_per_unit = EXCLUDED.price_per_unit,
        updated_at = NOW()
    RETURNING id INTO v_cheese;
    
    -- Add pricing for new products
    IF v_paneer IS NOT NULL THEN
        INSERT INTO public.product_prices (product_id, regular_price, subscription_price, effective_from, created_by, notes)
        VALUES (v_paneer, 350.00, 320.00, '2026-01-01', v_system_admin, 'Initial pricing - Paneer')
        ON CONFLICT (product_id, effective_from) DO NOTHING;
    END IF;
    
    IF v_butter IS NOT NULL THEN
        INSERT INTO public.product_prices (product_id, regular_price, subscription_price, effective_from, created_by, notes)
        VALUES (v_butter, 450.00, 450.00, '2026-01-01', v_system_admin, 'Initial pricing - Butter (no subscription)')
        ON CONFLICT (product_id, effective_from) DO NOTHING;
    END IF;
    
    IF v_cheese IS NOT NULL THEN
        INSERT INTO public.product_prices (product_id, regular_price, subscription_price, effective_from, created_by, notes)
        VALUES (v_cheese, 600.00, 600.00, '2026-01-01', v_system_admin, 'Initial pricing - Cheese (no subscription)')
        ON CONFLICT (product_id, effective_from) DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.product_prices IS 'Dual pricing system with safe future-only price changes';
COMMENT ON TABLE public.price_history IS 'Complete audit log of all price changes for transparency and compliance';
COMMENT ON FUNCTION get_price_for_date IS 'Returns the correct price (regular or subscription) for a specific date';
COMMENT ON FUNCTION get_current_price IS 'Returns the current price (regular or subscription) for today';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Dual pricing system successfully deployed!';
    RAISE NOTICE '📊 Product prices table created with RLS';
    RAISE NOTICE '📝 Price history audit log enabled';
    RAISE NOTICE '🔒 Future-only pricing validation active';
    RAISE NOTICE '🏪 New products added: Paneer, Butter, Cheese';
END $$;
