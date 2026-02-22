-- Drop and recreate the ALL policy with proper WITH CHECK
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
