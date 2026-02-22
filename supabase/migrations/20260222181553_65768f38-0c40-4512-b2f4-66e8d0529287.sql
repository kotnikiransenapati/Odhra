
-- Vendor notifications table
CREATE TABLE public.vendor_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own notifications"
  ON public.vendor_notifications FOR SELECT
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors can update own notifications"
  ON public.vendor_notifications FOR UPDATE
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all vendor notifications"
  ON public.vendor_notifications FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_vendor_notifications_vendor ON public.vendor_notifications(vendor_id, is_read, created_at DESC);

-- Payment reconciliation table
CREATE TABLE public.payment_reconciliation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  payment_gateway TEXT NOT NULL,
  gateway_transaction_id TEXT,
  gateway_amount NUMERIC NOT NULL DEFAULT 0,
  order_amount NUMERIC NOT NULL DEFAULT 0,
  discrepancy NUMERIC GENERATED ALWAYS AS (gateway_amount - order_amount) STORED,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment reconciliation"
  ON public.payment_reconciliation FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_payment_reconciliation_status ON public.payment_reconciliation(status);

-- Order notes table for order edit functionality
CREATE TABLE public.order_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'internal',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order notes"
  ON public.order_notes FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_order_notes_order ON public.order_notes(order_id, created_at DESC);

-- Inventory alerts table
CREATE TABLE public.inventory_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'low_stock',
  threshold INTEGER NOT NULL DEFAULT 10,
  current_stock INTEGER NOT NULL DEFAULT 0,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inventory alerts"
  ON public.inventory_alerts FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Vendors can view own inventory alerts"
  ON public.inventory_alerts FOR SELECT
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE INDEX idx_inventory_alerts_product ON public.inventory_alerts(product_id, is_resolved);

-- Enable realtime for vendor notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_notifications;
