
-- 1. Fix auto_generate_invoice to also fire for COD orders (cod_pending)
CREATE OR REPLACE FUNCTION public.auto_generate_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_sub RECORD;
  v_items JSONB;
  v_item RECORD;
  v_invoice_number TEXT;
  v_vendor_count INT := 0;
  should_generate BOOLEAN := false;
BEGIN
  -- Determine if we should generate invoice
  IF TG_OP = 'INSERT' THEN
    -- Generate on insert if payment_status is paid or cod_pending (confirmed COD)
    IF NEW.payment_status IN ('paid', 'cod_pending') AND NEW.status = 'confirmed' THEN
      should_generate := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Generate on update if payment status changes to paid (existing behavior)
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
      should_generate := true;
    END IF;
    -- Also generate if COD order becomes confirmed and no invoice exists yet
    IF NEW.payment_status = 'cod_pending' AND NEW.status = 'confirmed' AND 
       (OLD.status IS DISTINCT FROM 'confirmed') THEN
      -- Check if invoice already exists for this order
      IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE order_id = NEW.id) THEN
        should_generate := true;
      END IF;
    END IF;
  END IF;

  IF NOT should_generate THEN
    RETURN NEW;
  END IF;

  -- Check if invoices already exist for this order (prevent duplicates)
  IF EXISTS (SELECT 1 FROM public.invoices WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

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
      v_sub.total_amount, v_items,
      CASE WHEN NEW.payment_status = 'paid' THEN 'paid' ELSE 'issued' END,
      v_order.currency,
      jsonb_build_object('name', COALESCE(v_sub.brand_name, 'Marketplace'), 'gstin', COALESCE(v_sub.gstin, '')),
      jsonb_build_object('name', COALESCE(v_order.shipping_address->>'full_name', 'Customer')),
      v_order.shipping_address, v_order.billing_address, now()
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Drop old trigger and recreate to also fire on INSERT
DROP TRIGGER IF EXISTS auto_generate_invoice_trigger ON public.orders;
CREATE TRIGGER auto_generate_invoice_trigger
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_invoice();

-- 2. Update share_earn feature flag with percentage settings
UPDATE public.feature_flags 
SET settings = jsonb_build_object(
  'commission_type', 'percentage',
  'commission_percentage', 5,
  'min_reward', 10,
  'max_reward', 500
),
description = 'Enable share-and-earn affiliate rewards on product pages. Commission is percentage-based.'
WHERE feature_key = 'share_earn';
