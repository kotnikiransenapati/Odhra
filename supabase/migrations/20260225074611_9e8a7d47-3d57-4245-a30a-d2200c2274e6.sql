
-- Add gateway tracking and SLA columns to refunds table
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS gateway_response JSONB,
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credit_note_number TEXT,
  ADD COLUMN IF NOT EXISTS auto_processed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS speed TEXT DEFAULT 'normal';

-- Make refund_number auto-generated (allow NULL default, trigger fills it)
ALTER TABLE public.refunds ALTER COLUMN refund_number SET DEFAULT '';

-- Generate credit note numbers
CREATE OR REPLACE FUNCTION public.generate_credit_note_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.refunds WHERE credit_note_number IS NOT NULL;
  RETURN 'CN-' || to_char(now(), 'YYYY') || '-' || LPAD(counter::TEXT, 6, '0');
END;
$$;

-- Auto-set SLA deadline (48 hours from creation) and credit note on completion
CREATE OR REPLACE FUNCTION public.refund_lifecycle_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set SLA deadline on creation
  IF TG_OP = 'INSERT' THEN
    IF NEW.sla_deadline IS NULL THEN
      NEW.sla_deadline := now() + INTERVAL '48 hours';
    END IF;
  END IF;

  -- Generate credit note on completion
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    IF NEW.credit_note_number IS NULL THEN
      NEW.credit_note_number := public.generate_credit_note_number();
    END IF;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  END IF;

  -- Set processed_at when processing starts
  IF TG_OP = 'UPDATE' AND NEW.status = 'processing' AND OLD.status IS DISTINCT FROM 'processing' THEN
    IF NEW.processed_at IS NULL THEN
      NEW.processed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_lifecycle ON public.refunds;
CREATE TRIGGER trg_refund_lifecycle
  BEFORE INSERT OR UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_lifecycle_trigger();

-- Auto-create refund when return request is approved for refund
CREATE OR REPLACE FUNCTION public.auto_create_refund_on_return_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_refund_method TEXT;
  v_payment_id TEXT;
BEGIN
  -- Only fire when status changes to 'refund_approved'
  IF NEW.status = 'refund_approved' AND OLD.status IS DISTINCT FROM 'refund_approved' THEN
    -- Check if refund already exists for this return
    IF EXISTS (SELECT 1 FROM public.refunds WHERE return_request_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Get order payment details
    SELECT payment_status, payment_id, payment_method INTO v_order
    FROM public.orders WHERE id = NEW.order_id;

    -- Determine refund method based on original payment
    IF COALESCE(NEW.refund_method, 'original') = 'store_credit' THEN
      v_refund_method := 'store_credit';
    ELSIF v_order.payment_status = 'cod_pending' OR v_order.payment_method = 'cod' THEN
      v_refund_method := 'bank_transfer';
    ELSE
      v_refund_method := 'original';
      v_payment_id := v_order.payment_id;
    END IF;

    INSERT INTO public.refunds (
      refund_number, order_id, sub_order_id, customer_id, vendor_id,
      return_request_id, amount, reason, refund_type, refund_method,
      razorpay_payment_id, status, auto_processed
    ) VALUES (
      '', NEW.order_id, NEW.sub_order_id, NEW.customer_id, NEW.vendor_id,
      NEW.id, COALESCE(NEW.refund_amount, 0), 
      'Return approved: ' || COALESCE(NEW.return_reason, 'Customer return'),
      CASE WHEN NEW.refund_amount < (SELECT total_amount FROM orders WHERE id = NEW.order_id) THEN 'partial' ELSE 'full' END,
      v_refund_method,
      v_payment_id,
      'approved', true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_refund_on_return ON public.return_requests;
CREATE TRIGGER trg_auto_refund_on_return
  AFTER UPDATE ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_refund_on_return_approval();

-- Index for SLA monitoring
CREATE INDEX IF NOT EXISTS idx_refunds_sla ON public.refunds (sla_deadline) WHERE status NOT IN ('completed', 'rejected', 'failed');
CREATE INDEX IF NOT EXISTS idx_refunds_gateway ON public.refunds (gateway_status) WHERE gateway_status IS NOT NULL;
