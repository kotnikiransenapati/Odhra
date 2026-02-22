-- Product Variants System
-- Variant options (e.g., "Size", "Color")
CREATE TABLE public.product_variant_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Size", "Color"
    values TEXT[] NOT NULL DEFAULT '{}', -- e.g., ["S", "M", "L", "XL"]
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual variant combinations with their own price/stock
CREATE TABLE public.product_variants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT,
    option_values JSONB NOT NULL DEFAULT '{}', -- e.g., {"Size": "M", "Color": "Blue"}
    price_adjustment NUMERIC DEFAULT 0, -- +/- from base price
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guest checkout: allow orders without user_id
-- Add guest_email and guest_phone columns to orders for guest checkout
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Enable RLS
ALTER TABLE public.product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_variant_options
CREATE POLICY "Anyone can view variant options"
ON public.product_variant_options FOR SELECT
USING (true);

CREATE POLICY "Vendors can manage their variant options"
ON public.product_variant_options FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON p.vendor_id = v.id
        WHERE p.id = product_id AND v.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON p.vendor_id = v.id
        WHERE p.id = product_id AND v.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all variant options"
ON public.product_variant_options FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for product_variants
CREATE POLICY "Anyone can view active variants"
ON public.product_variants FOR SELECT
USING (is_active = true);

CREATE POLICY "Vendors can manage their variants"
ON public.product_variants FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON p.vendor_id = v.id
        WHERE p.id = product_id AND v.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON p.vendor_id = v.id
        WHERE p.id = product_id AND v.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all variants"
ON public.product_variants FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger for updated_at on product_variants
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variant_options_product_id ON public.product_variant_options(product_id);