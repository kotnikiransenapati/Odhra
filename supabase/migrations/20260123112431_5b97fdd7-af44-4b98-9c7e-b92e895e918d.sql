-- =============================================
-- 1. WhatsApp Messaging System
-- =============================================

-- WhatsApp message templates (pre-approved by Meta)
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  template_type TEXT NOT NULL CHECK (template_type IN ('order_confirmation', 'shipping_update', 'delivery_update', 'return_status', 'refund_status', 'promotional', 'dispute_update', 'custom')),
  language TEXT NOT NULL DEFAULT 'en',
  template_id TEXT, -- Meta template ID after approval
  header_type TEXT CHECK (header_type IN ('text', 'image', 'document', 'video')),
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB, -- Quick reply or CTA buttons
  variables TEXT[], -- Placeholder variables like {{1}}, {{2}}
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- WhatsApp message log
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id),
  message_type TEXT NOT NULL CHECK (message_type IN ('template', 'text', 'media')),
  message_content JSONB NOT NULL,
  meta_message_id TEXT, -- WhatsApp message ID from Meta
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  reference_type TEXT, -- 'order', 'return', 'dispute', 'campaign'
  reference_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- WhatsApp opt-in preferences
CREATE TABLE public.whatsapp_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  phone_number TEXT NOT NULL,
  order_notifications BOOLEAN NOT NULL DEFAULT true,
  shipping_notifications BOOLEAN NOT NULL DEFAULT true,
  return_notifications BOOLEAN NOT NULL DEFAULT true,
  promotional_messages BOOLEAN NOT NULL DEFAULT false,
  opted_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opted_out_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 2. Multi-Carrier Delivery System
-- =============================================

-- Supported delivery partners
CREATE TABLE public.delivery_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- 'shiprocket', 'delhivery', 'bluedart', 'dtdc', 'ecom_express'
  logo_url TEXT,
  api_base_url TEXT,
  tracking_url_template TEXT, -- URL pattern for customer tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  supported_services JSONB, -- express, standard, cod, etc.
  rate_card JSONB, -- Weight/zone based pricing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shipments linked to sub-orders
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID REFERENCES public.delivery_partners(id),
  awb_number TEXT, -- Air Waybill / Tracking number
  courier_name TEXT,
  pickup_scheduled_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  in_transit_at TIMESTAMP WITH TIME ZONE,
  out_for_delivery_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  current_status TEXT NOT NULL DEFAULT 'pending' CHECK (current_status IN ('pending', 'manifest_created', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'rto_initiated', 'rto_delivered', 'cancelled', 'lost')),
  current_location TEXT,
  estimated_delivery_date DATE,
  actual_weight DECIMAL(10,2),
  volumetric_weight DECIMAL(10,2),
  shipping_label_url TEXT,
  invoice_url TEXT,
  pod_url TEXT, -- Proof of delivery
  delivery_otp TEXT, -- OTP for secure delivery
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shipment tracking events (detailed timeline)
CREATE TABLE public.shipment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  event_description TEXT NOT NULL,
  location TEXT,
  location_city TEXT,
  location_state TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  raw_data JSONB, -- Original webhook payload
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 3. Returns & Refunds System
-- =============================================

-- Return requests
CREATE TABLE public.return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id),
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'received', 'inspected', 'refund_initiated', 'refund_completed', 'cancelled')),
  return_reason TEXT NOT NULL CHECK (return_reason IN ('defective', 'wrong_item', 'not_as_described', 'size_issue', 'quality_issue', 'changed_mind', 'damaged_in_transit', 'other')),
  return_reason_details TEXT,
  images TEXT[], -- Customer uploaded images of issue
  refund_amount DECIMAL(10,2),
  refund_method TEXT CHECK (refund_method IN ('original_payment', 'wallet', 'bank_transfer')),
  pickup_address JSONB,
  pickup_awb TEXT,
  pickup_partner_id UUID REFERENCES public.delivery_partners(id),
  pickup_scheduled_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  inspected_at TIMESTAMP WITH TIME ZONE,
  inspection_notes TEXT,
  inspection_result TEXT CHECK (inspection_result IN ('approved', 'rejected', 'partial')),
  admin_notes TEXT,
  vendor_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Return items (individual items in return request)
CREATE TABLE public.return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  refund_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 4. Disputes System
-- =============================================

-- Disputes raised by customers/vendors
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  return_request_id UUID REFERENCES public.return_requests(id),
  raised_by_type TEXT NOT NULL CHECK (raised_by_type IN ('customer', 'vendor', 'admin')),
  raised_by_id UUID NOT NULL REFERENCES auth.users(id),
  vendor_id UUID REFERENCES public.vendors(id),
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('order_not_received', 'item_not_as_described', 'refund_issue', 'payment_dispute', 'delivery_issue', 'vendor_complaint', 'customer_complaint', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'awaiting_customer', 'awaiting_vendor', 'escalated', 'resolved', 'closed')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  resolution_type TEXT CHECK (resolution_type IN ('refund_full', 'refund_partial', 'replacement', 'no_action', 'vendor_warning', 'vendor_penalty', 'customer_warning')),
  resolution_notes TEXT,
  resolution_amount DECIMAL(10,2),
  assigned_to UUID REFERENCES auth.users(id),
  escalated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dispute messages/comments
CREATE TABLE public.dispute_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'vendor', 'admin')),
  message TEXT NOT NULL,
  attachments TEXT[],
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Admin-only notes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 5. Algolia Sync Tracking
-- =============================================

-- Track product sync status with Algolia
CREATE TABLE public.algolia_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  error_message TEXT,
  algolia_object_id TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 6. Generate unique numbers
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_return_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'RET-' || to_char(now(), 'YYYYMMDD') || '-' || 
                upper(substring(md5(random()::text) from 1 for 6));
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_dispute_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'DSP-' || to_char(now(), 'YYYYMMDD') || '-' || 
                upper(substring(md5(random()::text) from 1 for 6));
  RETURN new_number;
END;
$$;

-- Auto-generate return number
CREATE OR REPLACE FUNCTION public.set_return_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := public.generate_return_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_return_number
  BEFORE INSERT ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_return_number();

-- Auto-generate dispute number
CREATE OR REPLACE FUNCTION public.set_dispute_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.dispute_number IS NULL OR NEW.dispute_number = '' THEN
    NEW.dispute_number := public.generate_dispute_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_dispute_number
  BEFORE INSERT ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_dispute_number();

-- =============================================
-- 7. Updated at triggers
-- =============================================

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_preferences_updated_at
  BEFORE UPDATE ON public.whatsapp_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_partners_updated_at
  BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 8. RLS Policies
-- =============================================

-- WhatsApp Templates (Admin only)
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage WhatsApp templates" ON public.whatsapp_templates
  FOR ALL USING (public.is_admin(auth.uid()));

-- WhatsApp Messages (Users see their own, admins see all)
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own WhatsApp messages" ON public.whatsapp_messages
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "System can insert WhatsApp messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (true);

-- WhatsApp Preferences (Users manage their own)
ALTER TABLE public.whatsapp_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their WhatsApp preferences" ON public.whatsapp_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Delivery Partners (Public read, admin write)
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view delivery partners" ON public.delivery_partners
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage delivery partners" ON public.delivery_partners
  FOR ALL USING (public.is_admin(auth.uid()));

-- Shipments (Customers see their orders, vendors see their sub-orders, admins see all)
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view their shipments" ON public.shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sub_orders so
      JOIN public.orders o ON o.id = so.order_id
      WHERE so.id = shipments.sub_order_id AND o.customer_id = auth.uid()
    ) OR public.is_admin(auth.uid()) OR public.is_vendor(auth.uid())
  );
CREATE POLICY "Vendors and admins can manage shipments" ON public.shipments
  FOR ALL USING (public.is_admin(auth.uid()) OR public.is_vendor(auth.uid()));

-- Shipment Events (Same as shipments)
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view shipment events" ON public.shipment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      JOIN public.sub_orders so ON so.id = s.sub_order_id
      JOIN public.orders o ON o.id = so.order_id
      WHERE s.id = shipment_events.shipment_id AND o.customer_id = auth.uid()
    ) OR public.is_admin(auth.uid()) OR public.is_vendor(auth.uid())
  );
CREATE POLICY "System can insert shipment events" ON public.shipment_events
  FOR INSERT WITH CHECK (true);

-- Return Requests
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view and create their returns" ON public.return_requests
  FOR ALL USING (auth.uid() = customer_id OR public.is_admin(auth.uid()) OR 
    (public.is_vendor(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = return_requests.vendor_id AND v.user_id = auth.uid()
    ))
  );

-- Return Items
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view return items" ON public.return_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.return_requests rr WHERE rr.id = return_items.return_request_id
      AND (rr.customer_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );
CREATE POLICY "Customers can create return items" ON public.return_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.return_requests rr WHERE rr.id = return_items.return_request_id
      AND rr.customer_id = auth.uid()
    )
  );

-- Disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their disputes" ON public.disputes
  FOR SELECT USING (
    auth.uid() = raised_by_id OR 
    public.is_admin(auth.uid()) OR
    (public.is_vendor(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = disputes.vendor_id AND v.user_id = auth.uid()
    ))
  );
CREATE POLICY "Users can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (auth.uid() = raised_by_id);
CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Dispute Messages
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view dispute messages" ON public.dispute_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.disputes d WHERE d.id = dispute_messages.dispute_id
      AND (d.raised_by_id = auth.uid() OR public.is_admin(auth.uid()) OR
        (public.is_vendor(auth.uid()) AND EXISTS (
          SELECT 1 FROM public.vendors v WHERE v.id = d.vendor_id AND v.user_id = auth.uid()
        ))
      )
    ) AND (NOT is_internal OR public.is_admin(auth.uid()))
  );
CREATE POLICY "Users can send dispute messages" ON public.dispute_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Algolia Sync Log (Admin only)
ALTER TABLE public.algolia_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage Algolia sync" ON public.algolia_sync_log
  FOR ALL USING (public.is_admin(auth.uid()));

-- =============================================
-- 9. Insert default delivery partners
-- =============================================

INSERT INTO public.delivery_partners (name, code, tracking_url_template, supported_services, is_active) VALUES
  ('Shiprocket', 'shiprocket', 'https://shiprocket.co/tracking/{{awb}}', '{"express": true, "standard": true, "cod": true}'::jsonb, true),
  ('Delhivery', 'delhivery', 'https://www.delhivery.com/track/package/{{awb}}', '{"express": true, "standard": true, "cod": true}'::jsonb, true),
  ('Blue Dart', 'bluedart', 'https://www.bluedart.com/tracking/{{awb}}', '{"express": true, "standard": true}'::jsonb, true),
  ('DTDC', 'dtdc', 'https://www.dtdc.in/tracking/shipment-tracking.asp?ref={{awb}}', '{"standard": true, "cod": true}'::jsonb, true),
  ('Ecom Express', 'ecom_express', 'https://ecomexpress.in/tracking/?awb={{awb}}', '{"standard": true, "cod": true}'::jsonb, true);

-- =============================================
-- 10. Insert default WhatsApp templates
-- =============================================

INSERT INTO public.whatsapp_templates (name, template_type, body_text, variables, status) VALUES
  ('order_confirmed', 'order_confirmation', 'Hi {{1}}! 🎉 Your order #{{2}} has been confirmed. Total: ₹{{3}}. Track your order at {{4}}', ARRAY['customer_name', 'order_number', 'total_amount', 'tracking_url'], 'pending'),
  ('order_shipped', 'shipping_update', 'Great news {{1}}! 📦 Your order #{{2}} has been shipped via {{3}}. Track: {{4}}', ARRAY['customer_name', 'order_number', 'courier_name', 'tracking_url'], 'pending'),
  ('out_for_delivery', 'delivery_update', 'Almost there {{1}}! 🚚 Your order #{{2}} is out for delivery. Expected by {{3}}', ARRAY['customer_name', 'order_number', 'expected_time'], 'pending'),
  ('order_delivered', 'delivery_update', 'Delivered! ✅ {{1}}, your order #{{2}} has been delivered. Enjoy your purchase! Rate us: {{3}}', ARRAY['customer_name', 'order_number', 'review_url'], 'pending'),
  ('return_approved', 'return_status', 'Hi {{1}}, your return request #{{2}} has been approved. Pickup scheduled for {{3}}', ARRAY['customer_name', 'return_number', 'pickup_date'], 'pending'),
  ('refund_processed', 'refund_status', 'Good news {{1}}! 💰 Your refund of ₹{{2}} for return #{{3}} has been processed. It will reflect in {{4}}', ARRAY['customer_name', 'refund_amount', 'return_number', 'refund_timeline'], 'pending');

-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_messages;