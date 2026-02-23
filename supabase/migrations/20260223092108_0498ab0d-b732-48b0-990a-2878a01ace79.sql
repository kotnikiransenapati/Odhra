
-- Use DROP IF EXISTS + CREATE to safely attach all triggers

-- 1. Vendor wallet crediting trigger
DROP TRIGGER IF EXISTS credit_vendor_wallet_on_delivery_trigger ON public.sub_orders;
CREATE TRIGGER credit_vendor_wallet_on_delivery_trigger
BEFORE UPDATE ON public.sub_orders
FOR EACH ROW
EXECUTE FUNCTION public.credit_vendor_wallet_on_delivery();

-- 2. Auto-generate invoices on payment confirmation
CREATE OR REPLACE FUNCTION public.auto_generate_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_sub RECORD;
  v_items JSONB;
  v_item RECORD;
  v_invoice_number TEXT;
  v_vendor_count INT := 0;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    SELECT * INTO v_order FROM public.orders WHERE id = NEW.id;
    SELECT COUNT(*) INTO v_vendor_count FROM public.sub_orders WHERE order_id = NEW.id;
    
    FOR v_sub IN 
      SELECT so.*, v.brand_name, v.gstin
      FROM public.sub_orders so
      LEFT JOIN public.vendors v ON so.vendor_id = v.id
      WHERE so.order_id = NEW.id
    LOOP
      v_items := '[]'::JSONB;
      FOR v_item IN
        SELECT oi.product_title, oi.quantity, oi.unit_price, oi.total_price, p.hsn_code
        FROM public.order_items oi
        LEFT JOIN public.products p ON oi.product_id = p.id
        WHERE oi.sub_order_id = v_sub.id
      LOOP
        v_items := v_items || jsonb_build_object(
          'description', v_item.product_title, 'qty', v_item.quantity,
          'unit_price', v_item.unit_price, 'total', v_item.total_price,
          'hsn_code', COALESCE(v_item.hsn_code, ''), 'tax_rate', 18
        );
      END LOOP;
      
      v_invoice_number := public.generate_invoice_number();
      
      INSERT INTO public.invoices (
        invoice_number, invoice_type, order_id, sub_order_id, customer_id, vendor_id,
        subtotal, tax_amount, discount_amount, shipping_amount, total_amount,
        items, status, currency, seller_details, buyer_details,
        shipping_address, billing_address, issued_at
      ) VALUES (
        v_invoice_number, 'sale', NEW.id, v_sub.id, v_order.customer_id, v_sub.vendor_id,
        v_sub.subtotal, v_sub.tax_amount,
        ROUND(COALESCE(v_order.discount_amount, 0)::numeric / GREATEST(v_vendor_count, 1), 2),
        ROUND(COALESCE(v_order.shipping_amount, 0)::numeric / GREATEST(v_vendor_count, 1), 2),
        v_sub.total_amount, v_items, 'issued', v_order.currency,
        jsonb_build_object('name', COALESCE(v_sub.brand_name, 'Marketplace'), 'gstin', COALESCE(v_sub.gstin, '')),
        jsonb_build_object('name', COALESCE(v_order.shipping_address->>'full_name', 'Customer')),
        v_order.shipping_address, v_order.billing_address, now()
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_generate_invoice_trigger ON public.orders;
CREATE TRIGGER auto_generate_invoice_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_invoice();

-- 3. Add hsn_code to products
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'hsn_code') THEN
    ALTER TABLE public.products ADD COLUMN hsn_code TEXT DEFAULT NULL;
  END IF;
END $$;

-- 4. WhatsApp business settings
INSERT INTO public.system_settings (key, value, category, description)
VALUES 
  ('whatsapp_business_phone', '"919876543210"', 'communication', 'WhatsApp business phone number'),
  ('whatsapp_default_message', '"Hi! I have a question about your products."', 'communication', 'Default pre-filled WhatsApp message'),
  ('whatsapp_enabled', 'true', 'communication', 'Enable WhatsApp chat button on storefront')
ON CONFLICT (key) DO NOTHING;

-- 5. Audit triggers for key admin actions
CREATE OR REPLACE FUNCTION public.audit_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'order_status_change', 'order', NEW.id::text,
      jsonb_build_object('status', OLD.status, 'payment_status', OLD.payment_status),
      jsonb_build_object('status', NEW.status, 'payment_status', NEW.payment_status));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS audit_order_status_change_trigger ON public.orders;
CREATE TRIGGER audit_order_status_change_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_order_status_change();

CREATE OR REPLACE FUNCTION public.audit_vendor_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
    INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(),
      CASE WHEN OLD.is_active IS DISTINCT FROM NEW.is_active THEN 'vendor_activation_change' ELSE 'vendor_verification_change' END,
      'vendor', NEW.id::text,
      jsonb_build_object('is_active', OLD.is_active, 'is_verified', OLD.is_verified),
      jsonb_build_object('is_active', NEW.is_active, 'is_verified', NEW.is_verified));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS audit_vendor_change_trigger ON public.vendors;
CREATE TRIGGER audit_vendor_change_trigger AFTER UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.audit_vendor_change();

CREATE OR REPLACE FUNCTION public.audit_product_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'product_created', 'product', NEW.id::text, jsonb_build_object('title', NEW.title, 'price', NEW.price));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, old_values)
    VALUES (auth.uid(), 'product_deleted', 'product', OLD.id::text, jsonb_build_object('title', OLD.title));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND (OLD.price IS DISTINCT FROM NEW.price OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'product_updated', 'product', NEW.id::text,
      jsonb_build_object('price', OLD.price, 'is_active', OLD.is_active),
      jsonb_build_object('price', NEW.price, 'is_active', NEW.is_active));
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS audit_product_change_trigger ON public.products;
CREATE TRIGGER audit_product_change_trigger AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_product_change();

-- 6. Re-attach missing triggers (with DROP IF EXISTS to be safe)
DROP TRIGGER IF EXISTS record_product_price_change ON public.products;
CREATE TRIGGER record_product_price_change AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.record_price_change();

DROP TRIGGER IF EXISTS sync_bundle_stock_on_product_update ON public.products;
CREATE TRIGGER sync_bundle_stock_on_product_update AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_bundle_stock();

DROP TRIGGER IF EXISTS set_ticket_number_trigger ON public.support_tickets;
CREATE TRIGGER set_ticket_number_trigger BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();

DROP TRIGGER IF EXISTS set_invoice_number_trigger ON public.invoices;
CREATE TRIGGER set_invoice_number_trigger BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

DROP TRIGGER IF EXISTS set_refund_number_trigger ON public.refunds;
CREATE TRIGGER set_refund_number_trigger BEFORE INSERT ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.set_refund_number();

DROP TRIGGER IF EXISTS set_return_number_trigger ON public.return_requests;
CREATE TRIGGER set_return_number_trigger BEFORE INSERT ON public.return_requests FOR EACH ROW EXECUTE FUNCTION public.set_return_number();

DROP TRIGGER IF EXISTS set_dispute_number_trigger ON public.disputes;
CREATE TRIGGER set_dispute_number_trigger BEFORE INSERT ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.set_dispute_number();

DROP TRIGGER IF EXISTS set_vendor_ticket_number_trigger ON public.vendor_support_tickets;
CREATE TRIGGER set_vendor_ticket_number_trigger BEFORE INSERT ON public.vendor_support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_vendor_ticket_number();
