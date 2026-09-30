-- =====================================================
-- 003_dual_pricing_system.sql
-- Delight Milk: Dual Pricing System (Regular & Subscription)
-- =====================================================

-- 1. Add Subscription Attributes to Products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS subscription_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS addon_product BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cutoff_time TIME DEFAULT '22:00:00';

-- 2. Create product_prices Table
CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    regular_price DECIMAL(10, 2) NOT NULL CHECK (regular_price >= 0),
    subscription_price DECIMAL(10, 2) NOT NULL CHECK (subscription_price >= 0),
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    CONSTRAINT valid_price_range CHECK (effective_until IS NULL OR effective_until >= effective_from),
    CONSTRAINT subscription_not_higher CHECK (subscription_price <= regular_price),
    CONSTRAINT no_overlapping_dates UNIQUE (product_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_product_prices_product ON public.product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_effective_from ON public.product_prices(effective_from);
CREATE INDEX IF NOT EXISTS idx_product_prices_active ON public.product_prices(is_active);

-- 3. Create price_history Audit Log Table
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    old_regular_price DECIMAL(10, 2),
    new_regular_price DECIMAL(10, 2) NOT NULL,
    old_subscription_price DECIMAL(10, 2),
    new_subscription_price DECIMAL(10, 2) NOT NULL,
    effective_from DATE NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_by_name VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reason TEXT,
    change_type VARCHAR(50) DEFAULT 'price_update' CHECK (change_type IN ('initial', 'price_update', 'promotion', 'correction'))
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON public.price_history(changed_at DESC);

-- 4. Enable RLS
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- 5. Canonical RLS Policies (Using has_role)
DROP POLICY IF EXISTS "Anyone can view active product prices" ON public.product_prices;
DROP POLICY IF EXISTS "Authenticated users can view all prices" ON public.product_prices;
DROP POLICY IF EXISTS "Only admins can manage prices" ON public.product_prices;
DROP POLICY IF EXISTS "Anyone can view price history" ON public.price_history;
DROP POLICY IF EXISTS "Only admins can manage history" ON public.price_history;

CREATE POLICY "Anyone can view active product prices"
ON public.product_prices FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can view all prices"
ON public.product_prices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage prices"
ON public.product_prices FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view price history"
ON public.price_history FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage history"
ON public.price_history FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Helper Function: Get Price for Date
CREATE OR REPLACE FUNCTION public.get_price_for_date(
    p_product_id UUID,
    p_date DATE,
    p_has_subscription BOOLEAN DEFAULT false
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_price DECIMAL(10, 2);
BEGIN
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
    
    RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Helper Function: Get Current Price
CREATE OR REPLACE FUNCTION public.get_current_price(
    p_product_id UUID,
    p_has_subscription BOOLEAN DEFAULT false
)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    RETURN public.get_price_for_date(p_product_id, CURRENT_DATE, p_has_subscription);
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Validation Trigger: Price Change Rules
CREATE OR REPLACE FUNCTION public.validate_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.effective_from < CURRENT_DATE THEN
        RAISE EXCEPTION 'Effective date must be today or in the future. Historical pricing changes are not allowed.';
    END IF;
    
    IF NEW.subscription_price > NEW.regular_price THEN
        RAISE WARNING 'Subscription price is higher than regular price. This is unusual.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_price_change_trigger ON public.product_prices;
CREATE TRIGGER validate_price_change_trigger
    BEFORE INSERT OR UPDATE ON public.product_prices
    FOR EACH ROW EXECUTE FUNCTION public.validate_price_change();

-- 9. Trigger: Log Price Changes to Audit Trail
CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS TRIGGER AS $$
DECLARE
    v_product_name VARCHAR(255);
    v_admin_name VARCHAR(255);
    v_old_regular DECIMAL(10, 2);
    v_old_subscription DECIMAL(10, 2);
BEGIN
    SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
    
    IF NEW.created_by IS NOT NULL THEN
        SELECT COALESCE(email, id::text) INTO v_admin_name FROM auth.users WHERE id = NEW.created_by;
    ELSE
        v_admin_name := 'System';
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        v_old_regular := OLD.regular_price;
        v_old_subscription := OLD.subscription_price;
    END IF;
    
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
        COALESCE(v_product_name, 'Unknown Product'),
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
    FOR EACH ROW EXECUTE FUNCTION public.log_price_change();

-- 10. Seed Initial Dual Prices (Temporarily disable validation trigger for historical seed date)
ALTER TABLE public.product_prices DISABLE TRIGGER validate_price_change_trigger;

DO $$
DECLARE
    v_prod RECORD;
BEGIN
    FOR v_prod IN SELECT id, slug, price_per_unit FROM public.products WHERE slug IS NOT NULL
    LOOP
        INSERT INTO public.product_prices (product_id, regular_price, subscription_price, effective_from, notes)
        VALUES (
            v_prod.id,
            v_prod.price_per_unit,
            CASE 
                WHEN v_prod.slug = 'cow-milk' THEN 55.00
                WHEN v_prod.slug = 'buffalo-milk' THEN 65.00
                WHEN v_prod.slug = 'organic-milk' THEN 85.00
                WHEN v_prod.slug = 'fresh-paneer' THEN 300.00
                ELSE v_prod.price_per_unit
            END,
            '2026-01-01',
            'Initial dual pricing setup'
        )
        ON CONFLICT (product_id, effective_from) DO NOTHING;
    END LOOP;
END $$;

ALTER TABLE public.product_prices ENABLE TRIGGER validate_price_change_trigger;
