
-- =============================================
-- Integration Settings table for all third-party configs
-- =============================================
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key TEXT UNIQUE NOT NULL,
  integration_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integration settings"
  ON public.integration_settings FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Shiprocket shipments tracking table
-- =============================================
CREATE TABLE IF NOT EXISTS public.shiprocket_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  shiprocket_order_id TEXT,
  shiprocket_shipment_id TEXT,
  awb_code TEXT,
  courier_name TEXT,
  courier_id INTEGER,
  label_url TEXT,
  manifest_url TEXT,
  pickup_scheduled_date TEXT,
  estimated_delivery TEXT,
  status TEXT DEFAULT 'pending',
  tracking_url TEXT,
  shipping_charges NUMERIC DEFAULT 0,
  weight NUMERIC,
  dimensions JSONB,
  pickup_address JSONB,
  delivery_address JSONB,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shiprocket_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shiprocket shipments"
  ON public.shiprocket_shipments FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Customers can view own shipments"
  ON public.shiprocket_shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = shiprocket_shipments.order_id 
      AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can view their shipments"
  ON public.shiprocket_shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_orders so
      JOIN public.vendors v ON so.vendor_id = v.id
      WHERE so.id = shiprocket_shipments.sub_order_id
      AND v.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_shiprocket_shipments_updated_at
  BEFORE UPDATE ON public.shiprocket_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Seed integration settings for all APIs
-- =============================================
INSERT INTO public.integration_settings (integration_key, integration_name, category, is_enabled, config) VALUES
  ('shiprocket', 'Shiprocket', 'shipping', false, '{"base_url": "https://apiv2.shiprocket.in/v1/external", "pickup_location": "", "default_weight": 0.5, "default_length": 20, "default_breadth": 15, "default_height": 10}'::jsonb),
  ('google_analytics', 'Google Analytics 4', 'analytics', false, '{"measurement_id": "", "stream_id": ""}'::jsonb),
  ('facebook_pixel', 'Facebook Pixel', 'analytics', false, '{"pixel_id": "", "access_token": ""}'::jsonb),
  ('google_recaptcha', 'Google reCAPTCHA v3', 'security', false, '{"site_key": "", "score_threshold": 0.5}'::jsonb),
  ('sentry', 'Sentry', 'monitoring', false, '{"dsn": "", "environment": "production", "traces_sample_rate": 0.1}'::jsonb),
  ('firebase_fcm', 'Firebase Cloud Messaging', 'notifications', false, '{"vapid_key": "", "project_id": "", "sender_id": ""}'::jsonb),
  ('google_merchant', 'Google Merchant Center', 'marketing', false, '{"merchant_id": ""}'::jsonb),
  ('cloudinary', 'Cloudinary', 'media', false, '{"cloud_name": "", "upload_preset": ""}'::jsonb)
ON CONFLICT (integration_key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_settings;
