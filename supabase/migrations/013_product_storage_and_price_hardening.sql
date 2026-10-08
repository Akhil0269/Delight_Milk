-- Migration 013: Product Storage & Price Validation Hardening
-- Enforces database-level constraint that product prices must be positive (> 0)
-- Grants admin authenticated users permission to delete storage objects in 'products' bucket

DO $$
BEGIN
    -- 1. Ensure price_per_unit check constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_price_per_unit_positive_check'
    ) THEN
        ALTER TABLE public.products
        ADD CONSTRAINT products_price_per_unit_positive_check
        CHECK (price_per_unit > 0);
    END IF;

    -- 2. Storage policy for Admins to delete product images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Admins Delete Products'
    ) THEN
        CREATE POLICY "Admins Delete Products" 
        ON storage.objects 
        FOR DELETE 
        TO authenticated 
        USING (
            (bucket_id = 'products'::text) AND has_role(auth.uid(), 'admin'::app_role)
        );
    END IF;
END $$;
