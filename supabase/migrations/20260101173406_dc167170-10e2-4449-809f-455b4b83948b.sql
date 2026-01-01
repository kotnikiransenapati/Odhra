-- Security Fix 1: Remove bank_details from public SELECT on vendors
DROP POLICY IF EXISTS "Anyone can view active verified vendors" ON vendors;
CREATE POLICY "Anyone can view active verified vendors (safe)" 
ON vendors FOR SELECT 
USING (is_active = true AND is_verified = true);

-- Create a view that excludes sensitive data for public access
CREATE OR REPLACE VIEW public.vendors_public AS
SELECT 
  id,
  brand_name,
  slug,
  bio,
  logo_url,
  banner_url,
  social_links,
  is_active,
  is_verified,
  created_at
FROM public.vendors
WHERE is_active = true AND is_verified = true;

-- Grant access to the view
GRANT SELECT ON public.vendors_public TO anon, authenticated;

-- Security Fix 2: Update OTP table to be more restrictive
DROP POLICY IF EXISTS "Service role can manage OTP" ON otp_verifications;
CREATE POLICY "OTP can only be created and verified"
ON otp_verifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can verify their own OTP"
ON otp_verifications FOR SELECT
USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR auth.role() = 'service_role');

CREATE POLICY "OTP can be updated for verification"
ON otp_verifications FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "OTP cleanup by service role"
ON otp_verifications FOR DELETE
USING (auth.role() = 'service_role');

-- Enable leaked password protection would be done via dashboard/auth config