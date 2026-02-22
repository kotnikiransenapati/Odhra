
-- =====================================================
-- BATCH 1: Order Timeline, Refunds, Invoices
-- =====================================================

-- 1. Order Activity Log (Order Timeline)
CREATE TABLE public.order_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sub_order_id UUID REFERENCES public.sub_orders(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_type TEXT NOT NULL DEFAULT 'system',
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all order activity" ON public.order_activity_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Customers can view own order activity" ON public.order_activity_log
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));

CREATE POLICY "Admins can insert order activity" ON public.order_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_vendor(auth.uid()));

CREATE INDEX idx_order_activity_order_id ON public.order_activity_log(order_id);
CREATE INDEX idx_order_activity_created_at ON public.order_activity_log(created_at DESC);

-- 2. Refunds Table
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  return_request_id UUID REFERENCES public.return_requests(id),
  customer_id UUID NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id),
  refund_type TEXT NOT NULL DEFAULT 'full',
  refund_method TEXT NOT NULL DEFAULT 'original',
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL,
  admin_notes TEXT,
  items JSONB DEFAULT '[]',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage refunds" ON public.refunds FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Customers can view own refunds" ON public.refunds FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Vendors can view own refunds" ON public.refunds FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE INDEX idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX idx_refunds_customer_id ON public.refunds(customer_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);

CREATE OR REPLACE FUNCTION public.generate_refund_number()
RETURNS TEXT LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN RETURN 'RFD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6)); END; $$;

CREATE OR REPLACE FUNCTION public.set_refund_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.refund_number IS NULL OR NEW.refund_number = '' THEN NEW.refund_number := public.generate_refund_number(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER set_refund_number_trigger BEFORE INSERT ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.set_refund_number();

-- 3. Invoices Table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  vendor_id UUID REFERENCES public.vendors(id),
  customer_id UUID NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'sale',
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  tax_breakdown JSONB DEFAULT '[]',
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  shipping_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_address JSONB,
  shipping_address JSONB,
  seller_details JSONB,
  buyer_details JSONB,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  terms TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Customers can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Vendors can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE counter INTEGER;
BEGIN SELECT COUNT(*) + 1 INTO counter FROM public.invoices; RETURN 'INV-' || to_char(now(), 'YYYY') || '-' || LPAD(counter::TEXT, 6, '0'); END; $$;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN NEW.invoice_number := public.generate_invoice_number(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER set_invoice_number_trigger BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

-- 4. Shipping Zones
CREATE TABLE public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  countries TEXT[] NOT NULL DEFAULT '{}',
  states TEXT[] DEFAULT '{}',
  postal_code_ranges JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Public can view active shipping zones" ON public.shipping_zones FOR SELECT USING (is_active = true);

-- 5. Shipping Rates
CREATE TABLE public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  delivery_partner_id UUID REFERENCES public.delivery_partners(id),
  name TEXT NOT NULL,
  description TEXT,
  rate_type TEXT NOT NULL DEFAULT 'flat',
  base_rate NUMERIC NOT NULL DEFAULT 0,
  per_kg_rate NUMERIC DEFAULT 0,
  free_above_amount NUMERIC,
  min_weight NUMERIC DEFAULT 0,
  max_weight NUMERIC,
  estimated_days_min INTEGER NOT NULL DEFAULT 3,
  estimated_days_max INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage shipping rates" ON public.shipping_rates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Public can view active shipping rates" ON public.shipping_rates FOR SELECT USING (is_active = true);

-- 6. Ticket Internal Notes
CREATE TABLE public.ticket_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  note TEXT NOT NULL,
  is_escalation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage internal notes" ON public.ticket_internal_notes FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_ticket_notes_ticket_id ON public.ticket_internal_notes(ticket_id);

-- 7. Canned Responses
CREATE TABLE public.ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  body TEXT NOT NULL,
  shortcut TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage templates" ON public.ticket_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 8. Ticket Tags
CREATE TABLE public.ticket_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage ticket tags" ON public.ticket_tags FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.ticket_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.ticket_tags(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, tag_id)
);

ALTER TABLE public.ticket_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage tag assignments" ON public.ticket_tag_assignments FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 9. SLA Policies
CREATE TABLE public.sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL,
  first_response_hours INTEGER NOT NULL DEFAULT 4,
  resolution_hours INTEGER NOT NULL DEFAULT 24,
  escalation_hours INTEGER NOT NULL DEFAULT 8,
  escalation_to UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage SLA policies" ON public.sla_policies FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Add SLA fields to support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS sla_policy_id UUID REFERENCES public.sla_policies(id),
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_first_response_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_resolution_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_to UUID,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 10. Ticket Links
CREATE TABLE public.ticket_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  target_ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'related',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_ticket_id, target_ticket_id)
);

ALTER TABLE public.ticket_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage ticket links" ON public.ticket_links FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 11. Vendor Performance Metrics
CREATE TABLE public.vendor_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  delivered_orders INTEGER NOT NULL DEFAULT 0,
  cancelled_orders INTEGER NOT NULL DEFAULT 0,
  returned_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  avg_delivery_days NUMERIC DEFAULT 0,
  on_time_delivery_rate NUMERIC DEFAULT 0,
  cancellation_rate NUMERIC DEFAULT 0,
  return_rate NUMERIC DEFAULT 0,
  avg_rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  response_time_hours NUMERIC DEFAULT 0,
  sla_compliance_rate NUMERIC DEFAULT 0,
  score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, period)
);

ALTER TABLE public.vendor_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage vendor metrics" ON public.vendor_performance_metrics FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Vendors can view own metrics" ON public.vendor_performance_metrics FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- 12. Vendor Support Tickets
CREATE TABLE public.vendor_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage vendor tickets" ON public.vendor_support_tickets FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Vendors can manage own tickets" ON public.vendor_support_tickets FOR ALL TO authenticated USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE TABLE public.vendor_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.vendor_support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage vendor ticket msgs" ON public.vendor_support_messages FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Vendors can manage own ticket msgs" ON public.vendor_support_messages FOR ALL TO authenticated USING (ticket_id IN (SELECT id FROM public.vendor_support_tickets WHERE vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.generate_vendor_ticket_number()
RETURNS TEXT LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE counter INTEGER;
BEGIN SELECT COUNT(*) + 1 INTO counter FROM public.vendor_support_tickets; RETURN 'VTK-' || LPAD(counter::TEXT, 6, '0'); END; $$;

CREATE OR REPLACE FUNCTION public.set_vendor_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN NEW.ticket_number := public.generate_vendor_ticket_number(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER set_vendor_ticket_number_trigger BEFORE INSERT ON public.vendor_support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_vendor_ticket_number();

-- 13. Customer Segments
CREATE TABLE public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  segment_type TEXT NOT NULL DEFAULT 'manual',
  criteria JSONB NOT NULL DEFAULT '{}',
  color TEXT NOT NULL DEFAULT '#6366f1',
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage segments" ON public.customer_segments FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.customer_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(segment_id, user_id)
);

ALTER TABLE public.customer_segment_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage segment members" ON public.customer_segment_members FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 14. Media Assets Library
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  tags TEXT[] DEFAULT '{}',
  folder TEXT DEFAULT 'general',
  uploaded_by UUID,
  used_in JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage media" ON public.media_assets FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Vendors can manage own media" ON public.media_assets FOR ALL TO authenticated USING (uploaded_by = auth.uid());
CREATE INDEX idx_media_assets_folder ON public.media_assets(folder);
CREATE INDEX idx_media_assets_tags ON public.media_assets USING GIN(tags);

-- 15. URL Redirects (SEO)
CREATE TABLE public.url_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path TEXT NOT NULL UNIQUE,
  target_path TEXT NOT NULL,
  redirect_type INTEGER NOT NULL DEFAULT 301,
  is_active BOOLEAN NOT NULL DEFAULT true,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.url_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage redirects" ON public.url_redirects FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Public can read active redirects" ON public.url_redirects FOR SELECT USING (is_active = true);

-- 16. Scheduled Reports
CREATE TABLE public.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  format TEXT NOT NULL DEFAULT 'csv',
  filters JSONB DEFAULT '{}',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage reports" ON public.scheduled_reports FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.refunds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_internal_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_support_messages;

-- NEW ADMIN PERMISSIONS (using correct enum values)
INSERT INTO public.admin_permission_definitions (permission_key, permission_name, category, description, is_sensitive) VALUES
  ('manage_refunds', 'Manage Refunds', 'finance', 'Process and approve refund requests', true),
  ('manage_invoices', 'Manage Invoices', 'finance', 'Create and manage invoices', false),
  ('manage_shipping', 'Manage Shipping', 'settings', 'Configure shipping zones and rates', false),
  ('manage_tax', 'Manage Tax', 'settings', 'Configure tax zones and rules', true),
  ('manage_sla', 'Manage SLA', 'support', 'Configure SLA policies', false),
  ('view_internal_notes', 'View Internal Notes', 'support', 'View ticket internal notes', false),
  ('manage_segments', 'Manage Segments', 'marketing', 'Create and manage customer segments', false),
  ('manage_media', 'Manage Media', 'content', 'Upload and manage media assets', false),
  ('manage_seo', 'Manage SEO', 'content', 'Manage SEO settings and redirects', false),
  ('manage_reports', 'Manage Reports', 'analytics', 'Create and manage scheduled reports', false),
  ('view_vendor_tickets', 'View Vendor Tickets', 'support', 'View and respond to vendor support tickets', false),
  ('manage_vendor_performance', 'Manage Vendor Performance', 'vendors', 'View and manage vendor performance metrics', false)
ON CONFLICT (permission_key) DO NOTHING;

-- TRIGGERS
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON public.shipping_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_shipping_rates_updated_at BEFORE UPDATE ON public.shipping_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sla_policies_updated_at BEFORE UPDATE ON public.sla_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_ticket_templates_updated_at BEFORE UPDATE ON public.ticket_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_vendor_perf_updated_at BEFORE UPDATE ON public.vendor_performance_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_vendor_tickets_updated_at BEFORE UPDATE ON public.vendor_support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON public.customer_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_redirects_updated_at BEFORE UPDATE ON public.url_redirects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.scheduled_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
