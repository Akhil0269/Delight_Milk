-- =====================================================
-- 008_orders_system.sql
-- Delight Milk: Orders & Order Items Foundation (Phase 1)
-- Additive Only - Zero Destructive Operations
-- =====================================================

-- 1. Create Required Enums for Order Management
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM ('confirmed', 'scheduled', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.order_payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.order_payment_method AS ENUM ('wallet', 'cod', 'phonepe');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Extend existing delivery_status enum with 'cancelled' if not already present
ALTER TYPE public.delivery_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. Create orders Table (One-Time Order Header / Core Record)
CREATE TABLE IF NOT EXISTS public.orders (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id     UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    quantity       DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit >= 0),
    total_amount   DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
    delivery_date  DATE NOT NULL,
    payment_method public.order_payment_method NOT NULL DEFAULT 'wallet',
    payment_status public.order_payment_status NOT NULL DEFAULT 'pending',
    status         public.order_status NOT NULL DEFAULT 'confirmed',
    delivery_id    UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
    notes          TEXT,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create order_items Table (Line Items for Orders)
CREATE TABLE IF NOT EXISTS public.order_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id     UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    quantity       DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit >= 0),
    total_amount   DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Extend Canonical deliveries Table with Order Tracking Fields (Additive Only)
ALTER TABLE public.deliveries
    ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'subscription'
        CHECK (delivery_type IN ('subscription', 'one_time'));

-- 5. Create Indexes for Orders, Order Items, and Delivery Linkage
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_id ON public.orders(delivery_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_order_unique
    ON public.deliveries(user_id, order_id, delivery_date)
    WHERE order_id IS NOT NULL;

-- 6. Trigger Functions & Triggers for updated_at and Order Items Sync
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at'
    ) THEN
        CREATE TRIGGER update_orders_updated_at
            BEFORE UPDATE ON public.orders
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_order_items_updated_at'
    ) THEN
        CREATE TRIGGER update_order_items_updated_at
            BEFORE UPDATE ON public.order_items
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Automatic sync of order line items from orders header
CREATE OR REPLACE FUNCTION public.sync_order_items_from_order()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.order_items (order_id, product_id, quantity, price_per_unit)
    VALUES (NEW.id, NEW.product_id, NEW.quantity, NEW.price_per_unit);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_sync_order_items'
    ) THEN
        CREATE TRIGGER trigger_sync_order_items
            AFTER INSERT ON public.orders
            FOR EACH ROW
            EXECUTE FUNCTION public.sync_order_items_from_order();
    END IF;
END $$;

-- 7. Enable Row Level Security (RLS) on Orders & Order Items
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies on orders
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Customers can view their own orders'
    ) THEN
        CREATE POLICY "Customers can view their own orders"
            ON public.orders FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Customers can create their own orders'
    ) THEN
        CREATE POLICY "Customers can create their own orders"
            ON public.orders FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Customers can cancel their own confirmed orders'
    ) THEN
        CREATE POLICY "Customers can cancel their own confirmed orders"
            ON public.orders FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id AND status = 'confirmed')
            WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can manage all orders'
    ) THEN
        CREATE POLICY "Admins can manage all orders"
            ON public.orders FOR ALL
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'))
            WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 9. RLS Policies on order_items
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Customers can view their own order items'
    ) THEN
        CREATE POLICY "Customers can view their own order items"
            ON public.order_items FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.orders o
                    WHERE o.id = order_items.order_id
                      AND o.user_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Customers can create their own order items'
    ) THEN
        CREATE POLICY "Customers can create their own order items"
            ON public.order_items FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.orders o
                    WHERE o.id = order_items.order_id
                      AND o.user_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admins can manage all order items'
    ) THEN
        CREATE POLICY "Admins can manage all order items"
            ON public.order_items FOR ALL
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'))
            WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 10. Enable Realtime Replication for orders (if supabase_realtime publication exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
