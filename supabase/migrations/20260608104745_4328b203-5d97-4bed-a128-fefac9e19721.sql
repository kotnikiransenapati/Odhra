
-- 1) system_settings: restrict public SELECT to an allowlist of non-sensitive keys
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
CREATE POLICY "Public can read public settings"
  ON public.system_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN (
    'site_name',
    'site_description',
    'support_email',
    'support_phone',
    'whatsapp_business_phone',
    'whatsapp_default_message',
    'whatsapp_enabled',
    'color_palette',
    'enable_flash_sales',
    'enable_spin_wheel',
    'maintenance_mode',
    'maintenance_message'
  ));

-- 2) admin_roles: stop leaking the RBAC permission map publicly
DROP POLICY IF EXISTS "Anyone can view admin roles" ON public.admin_roles;
CREATE POLICY "Admins can view admin roles"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 3) user_behavior_profiles: lock writes to the row owner
DROP POLICY IF EXISTS "System can insert behavior profiles" ON public.user_behavior_profiles;
DROP POLICY IF EXISTS "System can update behavior profiles" ON public.user_behavior_profiles;
CREATE POLICY "Users insert own behavior profile"
  ON public.user_behavior_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own behavior profile"
  ON public.user_behavior_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) storage.objects vendor-assets: drop unscoped policies; vendor-scoped + admin policies remain
DROP POLICY IF EXISTS "Authenticated users can upload vendor assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own vendor assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own vendor assets" ON storage.objects;
