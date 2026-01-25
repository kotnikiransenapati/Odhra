-- Fix remaining overly permissive RLS policy on shipment_events

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert shipment events" ON public.shipment_events;

-- Create a more restrictive policy - only service role or vendors/admins can insert
CREATE POLICY "Authorized shipment event inserts"
ON public.shipment_events
FOR INSERT
WITH CHECK (
  -- Service role (edge functions, webhooks)
  (auth.jwt() ->> 'role') = 'service_role'
  OR 
  -- Admins
  is_admin(auth.uid())
  OR
  -- Vendors can insert events for their own shipments
  EXISTS (
    SELECT 1 FROM shipments s
    JOIN sub_orders so ON s.sub_order_id = so.id
    JOIN vendors v ON so.vendor_id = v.id
    WHERE s.id = shipment_events.shipment_id
    AND v.user_id = auth.uid()
  )
);