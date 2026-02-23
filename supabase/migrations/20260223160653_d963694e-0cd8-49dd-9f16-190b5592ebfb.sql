-- Fix: Restrict vendor table SELECT to only admins and the vendor owner
-- Public storefront access should use the vendors_public view instead

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active verified vendors" ON public.vendors;

-- Recreate: only the vendor owner or admins can see the full vendors row
CREATE POLICY "Vendor owner or admin can view vendor details"
ON public.vendors
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
);
