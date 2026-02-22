
-- Fix: Public vendor SELECT policy exposes bank_details to anonymous users
-- Drop the overly permissive policy and replace with a safe one using the vendors_public view pattern

DROP POLICY IF EXISTS "Anyone can view active verified vendors (safe)" ON public.vendors;

-- Recreate: public can see vendor data BUT exclude sensitive columns via RLS
-- Since RLS can't filter columns, we restrict public access to go through vendors_public view only
-- Deny direct public SELECT on vendors table for anonymous users
CREATE POLICY "Authenticated users can view active verified vendors"
ON public.vendors
FOR SELECT
TO authenticated
USING (
  (is_active = true AND is_verified = true) OR 
  (auth.uid() = user_id) OR 
  is_admin(auth.uid())
);

-- Add admin SELECT for orders (needed for admin dashboard)
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Add vendor access to view their sub-order's parent orders
CREATE POLICY "Vendors can view orders with their sub-orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sub_orders so 
    JOIN vendors v ON so.vendor_id = v.id 
    WHERE so.order_id = orders.id AND v.user_id = auth.uid()
  )
);
