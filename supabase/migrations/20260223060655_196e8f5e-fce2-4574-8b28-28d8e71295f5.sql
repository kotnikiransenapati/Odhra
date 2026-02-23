
-- Create order_cancellations table for tracking cancellation requests
CREATE TABLE public.order_cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sub_order_id UUID REFERENCES public.sub_orders(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL,
  reason TEXT NOT NULL,
  reason_category TEXT NOT NULL DEFAULT 'other',
  additional_comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  refund_amount NUMERIC DEFAULT 0,
  refund_status TEXT DEFAULT 'pending',
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;

-- Customers can view their own cancellation requests
CREATE POLICY "Customers can view own cancellations"
  ON public.order_cancellations FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can create cancellation requests for their orders
CREATE POLICY "Customers can create cancellation requests"
  ON public.order_cancellations FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Admins can view all cancellations
CREATE POLICY "Admins can view all cancellations"
  ON public.order_cancellations FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update cancellation requests
CREATE POLICY "Admins can update cancellations"
  ON public.order_cancellations FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Vendors can view cancellations for their sub-orders
CREATE POLICY "Vendors can view their cancellations"
  ON public.order_cancellations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_orders so
      JOIN public.vendors v ON v.id = so.vendor_id
      WHERE so.id = order_cancellations.sub_order_id
        AND v.user_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_order_cancellations_updated_at
  BEFORE UPDATE ON public.order_cancellations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index
CREATE INDEX idx_order_cancellations_order_id ON public.order_cancellations(order_id);
CREATE INDEX idx_order_cancellations_customer_id ON public.order_cancellations(customer_id);
