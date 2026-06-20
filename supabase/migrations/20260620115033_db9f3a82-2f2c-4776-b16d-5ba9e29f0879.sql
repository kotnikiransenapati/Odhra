CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  state_code text,
  pincode text NOT NULL,
  country text NOT NULL DEFAULT 'IN',
  contact_name text,
  contact_phone text,
  lat numeric,
  lng numeric,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  cutoff_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT SELECT ON public.warehouses TO anon;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active warehouses" ON public.warehouses FOR SELECT USING (is_active = true);
CREATE POLICY "Vendors manage own warehouses" ON public.warehouses FOR ALL TO authenticated
  USING (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.warehouse_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  safety_stock integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_id, variant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_inventory TO authenticated;
GRANT ALL ON public.warehouse_inventory TO service_role;
ALTER TABLE public.warehouse_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor admin manage warehouse inventory" ON public.warehouse_inventory FOR ALL TO authenticated
  USING (warehouse_id IN (SELECT w.id FROM public.warehouses w WHERE w.vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (warehouse_id IN (SELECT w.id FROM public.warehouses w WHERE w.vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_wh_inv_product ON public.warehouse_inventory(product_id);

CREATE TABLE IF NOT EXISTS public.shipment_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  carrier text,
  service_code text,
  awb text,
  tracking_url text,
  weight_grams integer,
  length_cm numeric, width_cm numeric, height_cm numeric,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_packages TO authenticated;
GRANT ALL ON public.shipment_packages TO service_role;
ALTER TABLE public.shipment_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view their shipments" ON public.shipment_packages FOR SELECT TO authenticated
  USING (order_id IN (SELECT o.id FROM public.orders o WHERE o.customer_id = auth.uid())
         OR vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin vendor manage shipments" ON public.shipment_packages FOR ALL TO authenticated
  USING (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_shipment_packages_order ON public.shipment_packages(order_id);

-- L3 extensions to existing returns tables
ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS rma_type text DEFAULT 'return' CHECK (rma_type IN ('return','exchange','replacement')),
  ADD COLUMN IF NOT EXISTS qc_result jsonb,
  ADD COLUMN IF NOT EXISTS evidence_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pickup_carrier text;

ALTER TABLE public.return_items
  ADD COLUMN IF NOT EXISTS qc_status text CHECK (qc_status IN ('pending','passed','failed','partial')),
  ADD COLUMN IF NOT EXISTS qc_notes text,
  ADD COLUMN IF NOT EXISTS restock boolean DEFAULT true;

CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wh_inv_updated BEFORE UPDATE ON public.warehouse_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shipment_packages_updated BEFORE UPDATE ON public.shipment_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();