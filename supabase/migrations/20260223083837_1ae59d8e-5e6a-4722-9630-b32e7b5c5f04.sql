
-- Create security definer functions to break circular RLS dependency

-- Function to check if a user owns an order (for sub_orders policy)
CREATE OR REPLACE FUNCTION public.is_order_customer(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id AND customer_id = _user_id
  )
$$;

-- Function to check if a vendor has sub-orders in an order (for orders policy)
CREATE OR REPLACE FUNCTION public.is_order_vendor(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sub_orders so
    JOIN public.vendors v ON so.vendor_id = v.id
    WHERE so.order_id = _order_id AND v.user_id = _user_id
  )
$$;

-- Function to check if user can view order item
CREATE OR REPLACE FUNCTION public.can_view_order_item(_sub_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sub_orders so
    JOIN public.orders o ON so.order_id = o.id
    WHERE so.id = _sub_order_id
      AND (
        o.customer_id = _user_id
        OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = so.vendor_id AND v.user_id = _user_id)
        OR public.is_admin(_user_id)
      )
  )
$$;

-- Drop and recreate orders vendor policy
DROP POLICY IF EXISTS "Vendors can view orders with their sub-orders" ON public.orders;
CREATE POLICY "Vendors can view orders with their sub-orders"
  ON public.orders FOR SELECT
  USING (public.is_order_vendor(id, auth.uid()));

-- Drop and recreate sub_orders customer policy
DROP POLICY IF EXISTS "Customers can view own sub-orders" ON public.sub_orders;
CREATE POLICY "Customers can view own sub-orders"
  ON public.sub_orders FOR SELECT
  USING (public.is_order_customer(order_id, auth.uid()));

-- Drop and recreate order_items policy
DROP POLICY IF EXISTS "Users can view related order items" ON public.order_items;
CREATE POLICY "Users can view related order items"
  ON public.order_items FOR SELECT
  USING (public.can_view_order_item(sub_order_id, auth.uid()));
