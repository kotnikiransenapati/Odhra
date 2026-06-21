DROP POLICY IF EXISTS "Public can read public settings" ON public.system_settings;
CREATE POLICY "Public can read public settings"
  ON public.system_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN (
    'site_name','site_description','support_email','support_phone',
    'whatsapp_business_phone','whatsapp_default_message','whatsapp_enabled',
    'color_palette','enable_flash_sales','enable_spin_wheel',
    'maintenance_mode','maintenance_message','site_template'
  ));