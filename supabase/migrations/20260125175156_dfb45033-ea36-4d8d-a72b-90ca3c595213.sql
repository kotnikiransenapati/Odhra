-- PHASE 2: Advanced Commerce Features

-- =============================================
-- 2.1 MULTI-CURRENCY SUPPORT
-- =============================================
CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY, -- 'INR', 'USD', 'EUR'
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate, is_default) VALUES
  ('INR', 'Indian Rupee', '₹', 1, true),
  ('USD', 'US Dollar', '$', 0.012, false),
  ('EUR', 'Euro', '€', 0.011, false),
  ('GBP', 'British Pound', '£', 0.0095, false),
  ('AED', 'UAE Dirham', 'د.إ', 0.044, false)
ON CONFLICT (code) DO NOTHING;

-- Add currency preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'INR';

-- Add currency to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'INR';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC DEFAULT 1;

-- RLS for currencies
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view currencies" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "Admins can manage currencies" ON public.currencies FOR ALL USING (is_admin(auth.uid()));

-- =============================================
-- 2.2 ADVANCED TAX ENGINE
-- =============================================
CREATE TABLE IF NOT EXISTS public.tax_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  states TEXT[], -- NULL means all states in country
  tax_rates JSONB NOT NULL DEFAULT '{}', -- {"GST": 18, "CESS": 0}
  category_overrides JSONB DEFAULT '{}', -- {"electronics": {"GST": 12}}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default Indian tax zones
INSERT INTO public.tax_zones (name, country, tax_rates) VALUES
  ('Standard GST', 'IN', '{"GST": 18}'),
  ('Reduced GST', 'IN', '{"GST": 12}'),
  ('Lower GST', 'IN', '{"GST": 5}'),
  ('Zero GST', 'IN', '{"GST": 0}')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tax_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID, -- For B2B customers
  exemption_type TEXT NOT NULL, -- 'export', 'b2b', 'special_zone', 'diplomatic'
  gstin TEXT, -- B2B GST number
  certificate_url TEXT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for tax tables
ALTER TABLE public.tax_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tax zones" ON public.tax_zones FOR SELECT USING (true);
CREATE POLICY "Admins can manage tax zones" ON public.tax_zones FOR ALL USING (is_admin(auth.uid()));

ALTER TABLE public.tax_exemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own exemptions" ON public.tax_exemptions 
  FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Vendors can view own exemptions" ON public.tax_exemptions 
  FOR SELECT USING (EXISTS (SELECT 1 FROM vendors v WHERE v.id = tax_exemptions.vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can create exemption requests" ON public.tax_exemptions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage exemptions" ON public.tax_exemptions 
  FOR ALL USING (is_admin(auth.uid()));

-- =============================================
-- 2.3 INVENTORY MANAGEMENT SYSTEM
-- =============================================
CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address JSONB,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, code)
);

CREATE TABLE IF NOT EXISTS public.inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0, -- Reserved for pending orders
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL, -- Positive for in, negative for out
  movement_type TEXT NOT NULL, -- 'sale', 'restock', 'adjustment', 'transfer', 'return', 'reserved', 'released'
  reference_type TEXT, -- 'order', 'return', 'transfer', 'manual'
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add inventory tracking to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN DEFAULT false;

-- RLS for inventory tables
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can manage own locations" ON public.inventory_locations
  FOR ALL USING (EXISTS (SELECT 1 FROM vendors v WHERE v.id = inventory_locations.vendor_id AND v.user_id = auth.uid()) OR is_admin(auth.uid()));

ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can manage own inventory" ON public.inventory_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inventory_locations il
      JOIN vendors v ON il.vendor_id = v.id
      WHERE il.id = inventory_levels.location_id AND v.user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );
CREATE POLICY "Anyone can view inventory levels" ON public.inventory_levels FOR SELECT USING (true);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view own movements" ON public.inventory_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inventory_locations il
      JOIN vendors v ON il.vendor_id = v.id
      WHERE il.id = inventory_movements.location_id AND v.user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );
CREATE POLICY "Authorized inventory inserts" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role' OR is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM inventory_locations il
      JOIN vendors v ON il.vendor_id = v.id
      WHERE il.id = inventory_movements.location_id AND v.user_id = auth.uid()
    )
  );

-- =============================================
-- 2.4 PRODUCT BUNDLES
-- =============================================
CREATE TABLE IF NOT EXISTS public.product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  bundle_price NUMERIC NOT NULL,
  compare_at_price NUMERIC, -- Sum of individual product prices
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER NOT NULL DEFAULT 0, -- Calculated from min component stock
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(bundle_id, product_id)
);

-- RLS for bundles
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active bundles" ON public.product_bundles 
  FOR SELECT USING (is_active = true OR is_admin(auth.uid()));
CREATE POLICY "Vendors can manage own bundles" ON public.product_bundles
  FOR ALL USING (EXISTS (SELECT 1 FROM vendors v WHERE v.id = product_bundles.vendor_id AND v.user_id = auth.uid()) OR is_admin(auth.uid()));

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view bundle items" ON public.bundle_items FOR SELECT USING (true);
CREATE POLICY "Vendors can manage bundle items" ON public.bundle_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM product_bundles pb
      JOIN vendors v ON pb.vendor_id = v.id
      WHERE pb.id = bundle_items.bundle_id AND v.user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

-- =============================================
-- 2.5 FLASH SALES ENGINE (Bonus)
-- =============================================
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  banner_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_quantity_per_user INTEGER DEFAULT 2,
  early_access_tiers TEXT[] DEFAULT '{}', -- Loyalty tiers with early access
  early_access_hours INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flash_sale_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id UUID REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  flash_price NUMERIC NOT NULL,
  original_price NUMERIC NOT NULL,
  quantity_available INTEGER NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  UNIQUE(flash_sale_id, product_id)
);

-- RLS for flash sales
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view flash sales" ON public.flash_sales FOR SELECT USING (true);
CREATE POLICY "Admins can manage flash sales" ON public.flash_sales FOR ALL USING (is_admin(auth.uid()));

ALTER TABLE public.flash_sale_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view flash sale products" ON public.flash_sale_products FOR SELECT USING (true);
CREATE POLICY "Admins can manage flash sale products" ON public.flash_sale_products FOR ALL USING (is_admin(auth.uid()));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate bundle stock based on component availability
CREATE OR REPLACE FUNCTION public.calculate_bundle_stock(p_bundle_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_stock INTEGER;
BEGIN
  SELECT MIN(FLOOR(p.stock / bi.quantity))::INTEGER INTO min_stock
  FROM bundle_items bi
  JOIN products p ON bi.product_id = p.id
  WHERE bi.bundle_id = p_bundle_id;
  
  RETURN COALESCE(min_stock, 0);
END;
$$;

-- Function to convert price between currencies
CREATE OR REPLACE FUNCTION public.convert_currency(
  p_amount NUMERIC,
  p_from_currency TEXT,
  p_to_currency TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_rate NUMERIC;
  to_rate NUMERIC;
  result NUMERIC;
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN p_amount;
  END IF;
  
  SELECT exchange_rate INTO from_rate FROM currencies WHERE code = p_from_currency;
  SELECT exchange_rate INTO to_rate FROM currencies WHERE code = p_to_currency;
  
  IF from_rate IS NULL OR to_rate IS NULL THEN
    RETURN p_amount;
  END IF;
  
  -- Convert to base (INR) then to target
  result := (p_amount / from_rate) * to_rate;
  RETURN ROUND(result, 2);
END;
$$;

-- Trigger to update bundle stock when products change
CREATE OR REPLACE FUNCTION public.update_bundle_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE product_bundles pb
  SET stock = calculate_bundle_stock(pb.id),
      updated_at = now()
  WHERE pb.id IN (
    SELECT bundle_id FROM bundle_items WHERE product_id = NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_bundle_stock ON products;
CREATE TRIGGER trigger_update_bundle_stock
AFTER UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION update_bundle_stock();