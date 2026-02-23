-- Allow everyone (including guests) to read system settings like color palettes
CREATE POLICY "Anyone can read system settings"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (true);
