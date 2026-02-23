-- Fix: Allow anonymous users to view active verified vendors (needed for product browsing)
DROP POLICY IF EXISTS "Authenticated users can view active verified vendors" ON public.vendors;

CREATE POLICY "Anyone can view active verified vendors"
ON public.vendors
FOR SELECT
TO anon, authenticated
USING (
  (is_active = true AND is_verified = true)
  OR (auth.uid() = user_id)
  OR is_admin(auth.uid())
);