
-- India Post shipments tracking table
CREATE TABLE public.indiapost_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  consignment_number TEXT NOT NULL,
  article_type TEXT DEFAULT 'speed_post',
  booking_date TIMESTAMPTZ,
  sender_name TEXT,
  sender_pincode TEXT,
  receiver_name TEXT,
  receiver_pincode TEXT,
  destination_pincode TEXT,
  origin_pincode TEXT,
  weight_grams INTEGER,
  declared_value NUMERIC(10,2),
  cod_amount NUMERIC(10,2) DEFAULT 0,
  current_status TEXT DEFAULT 'booked',
  current_location TEXT,
  expected_delivery_date DATE,
  delivered_at TIMESTAMPTZ,
  last_tracked_at TIMESTAMPTZ,
  tracking_events JSONB DEFAULT '[]'::jsonb,
  raw_api_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- India Post pincode serviceability cache
CREATE TABLE public.indiapost_pincode_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pincode TEXT NOT NULL,
  office_name TEXT,
  office_type TEXT,
  delivery_status TEXT,
  division TEXT,
  region TEXT,
  circle TEXT,
  district TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  services_available TEXT[] DEFAULT '{}',
  is_serviceable BOOLEAN DEFAULT true,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pincode)
);

-- India Post rate card configuration
CREATE TABLE public.indiapost_rate_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL, -- speed_post, registered_post, emi_speed_post, business_parcel
  weight_slab_min_grams INTEGER NOT NULL DEFAULT 0,
  weight_slab_max_grams INTEGER NOT NULL DEFAULT 500,
  zone TEXT DEFAULT 'local', -- local, zone_a, zone_b, zone_c, zone_d, zone_e
  base_rate NUMERIC(10,2) NOT NULL,
  additional_per_500g NUMERIC(10,2) DEFAULT 0,
  cod_charge NUMERIC(10,2) DEFAULT 0,
  insurance_percent NUMERIC(5,2) DEFAULT 0,
  estimated_days_min INTEGER DEFAULT 2,
  estimated_days_max INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- India Post delivery zones mapping (pincode prefix to zone)
CREATE TABLE public.indiapost_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_prefix TEXT NOT NULL, -- first 3 digits of origin pincode
  destination_prefix TEXT NOT NULL, -- first 3 digits of dest pincode
  zone TEXT NOT NULL, -- local, zone_a, zone_b, zone_c, zone_d, zone_e
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(origin_prefix, destination_prefix)
);

-- Enable RLS
ALTER TABLE public.indiapost_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indiapost_pincode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indiapost_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indiapost_zones ENABLE ROW LEVEL SECURITY;

-- RLS: Admins full access on shipments, customers can see own
CREATE POLICY "Admins manage indiapost_shipments"
  ON public.indiapost_shipments FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Customers view own indiapost_shipments"
  ON public.indiapost_shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = indiapost_shipments.order_id 
      AND o.customer_id = auth.uid()
    )
  );

-- Pincode cache: public read, admin write
CREATE POLICY "Anyone can read pincode cache"
  ON public.indiapost_pincode_cache FOR SELECT
  USING (true);

CREATE POLICY "Admins manage pincode cache"
  ON public.indiapost_pincode_cache FOR ALL
  USING (public.is_admin(auth.uid()));

-- Rate cards: public read, admin write
CREATE POLICY "Anyone can read rate cards"
  ON public.indiapost_rate_cards FOR SELECT
  USING (true);

CREATE POLICY "Admins manage rate cards"
  ON public.indiapost_rate_cards FOR ALL
  USING (public.is_admin(auth.uid()));

-- Zones: public read, admin write
CREATE POLICY "Anyone can read zones"
  ON public.indiapost_zones FOR SELECT
  USING (true);

CREATE POLICY "Admins manage zones"
  ON public.indiapost_zones FOR ALL
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_indiapost_shipments_updated_at
  BEFORE UPDATE ON public.indiapost_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_indiapost_rate_cards_updated_at
  BEFORE UPDATE ON public.indiapost_rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for shipment tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.indiapost_shipments;

-- Add India Post integration settings if not exists
INSERT INTO public.integration_settings (integration_key, integration_name, category, is_enabled, config)
VALUES ('indiapost', 'India Post', 'shipping', false, '{"api_base_url": "https://api.postalpincode.in", "default_origin_pincode": "", "default_service": "speed_post"}'::jsonb)
ON CONFLICT (integration_key) DO NOTHING;

-- Seed default rate cards for India Post Speed Post
INSERT INTO public.indiapost_rate_cards (service_type, weight_slab_min_grams, weight_slab_max_grams, zone, base_rate, additional_per_500g, cod_charge, estimated_days_min, estimated_days_max) VALUES
  ('speed_post', 0, 500, 'local', 30, 15, 45, 1, 2),
  ('speed_post', 0, 500, 'zone_a', 40, 20, 45, 2, 3),
  ('speed_post', 0, 500, 'zone_b', 50, 25, 45, 3, 4),
  ('speed_post', 0, 500, 'zone_c', 60, 30, 45, 4, 5),
  ('speed_post', 0, 500, 'zone_d', 70, 35, 45, 5, 7),
  ('speed_post', 501, 1000, 'local', 45, 15, 45, 1, 2),
  ('speed_post', 501, 1000, 'zone_a', 55, 20, 45, 2, 3),
  ('speed_post', 501, 1000, 'zone_b', 65, 25, 45, 3, 4),
  ('speed_post', 501, 1000, 'zone_c', 75, 30, 45, 4, 5),
  ('speed_post', 501, 1000, 'zone_d', 85, 35, 45, 5, 7),
  ('registered_post', 0, 500, 'local', 15, 10, 35, 3, 5),
  ('registered_post', 0, 500, 'zone_a', 20, 12, 35, 4, 6),
  ('registered_post', 0, 500, 'zone_b', 25, 15, 35, 5, 7),
  ('registered_post', 0, 500, 'zone_c', 30, 18, 35, 6, 8),
  ('registered_post', 0, 500, 'zone_d', 35, 20, 35, 7, 10),
  ('ems_speed_post', 0, 500, 'local', 50, 25, 60, 1, 2),
  ('ems_speed_post', 0, 500, 'zone_a', 65, 30, 60, 1, 3),
  ('ems_speed_post', 0, 500, 'zone_b', 80, 35, 60, 2, 3),
  ('ems_speed_post', 0, 500, 'zone_c', 95, 40, 60, 2, 4),
  ('ems_speed_post', 0, 500, 'zone_d', 110, 45, 60, 3, 5),
  ('business_parcel', 0, 2000, 'local', 25, 5, 40, 3, 5),
  ('business_parcel', 0, 2000, 'zone_a', 35, 8, 40, 4, 7),
  ('business_parcel', 0, 2000, 'zone_b', 45, 10, 40, 5, 8),
  ('business_parcel', 0, 2000, 'zone_c', 55, 12, 40, 6, 10),
  ('business_parcel', 0, 2000, 'zone_d', 65, 15, 40, 7, 12);
