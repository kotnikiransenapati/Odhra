
-- ============ Add outstanding column to wholesaler_accounts ============
ALTER TABLE public.wholesaler_accounts
  ADD COLUMN IF NOT EXISTS current_outstanding numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_days integer NOT NULL DEFAULT 30;

-- ============ wholesale_credit_ledger ============
CREATE TABLE IF NOT EXISTS public.wholesale_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('charge','payment','adjustment','refund','writeoff')),
  amount numeric(14,2) NOT NULL,
  direction text NOT NULL CHECK (direction IN ('debit','credit')),
  balance_after numeric(14,2) NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  invoice_id uuid,
  order_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wholesale_credit_ledger TO authenticated;
GRANT ALL ON public.wholesale_credit_ledger TO service_role;
ALTER TABLE public.wholesale_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers view own ledger" ON public.wholesale_credit_ledger
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.wholesaler_accounts wa
            WHERE wa.id = wholesale_credit_ledger.wholesaler_id
              AND wa.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage ledger" ON public.wholesale_credit_ledger
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_wcl_wholesaler ON public.wholesale_credit_ledger(wholesaler_id, created_at DESC);

-- ============ wholesale_invoices ============
CREATE TABLE IF NOT EXISTS public.wholesale_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  wholesaler_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE RESTRICT,
  order_id uuid,
  billing_name text NOT NULL,
  billing_gstin text,
  billing_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  place_of_supply text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_total numeric(14,2) NOT NULL DEFAULT 0,
  cgst_total numeric(14,2) NOT NULL DEFAULT 0,
  sgst_total numeric(14,2) NOT NULL DEFAULT 0,
  igst_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  round_off numeric(6,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  amount_due numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','partial','paid','overdue','void')),
  pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wholesale_invoices TO authenticated;
GRANT ALL ON public.wholesale_invoices TO service_role;
ALTER TABLE public.wholesale_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers view own invoices" ON public.wholesale_invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.wholesaler_accounts wa
            WHERE wa.id = wholesale_invoices.wholesaler_id AND wa.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage invoices" ON public.wholesale_invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_winv_wholesaler ON public.wholesale_invoices(wholesaler_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_winv_status ON public.wholesale_invoices(status, due_date);

-- ============ wholesale_invoice_items ============
CREATE TABLE IF NOT EXISTS public.wholesale_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.wholesale_invoices(id) ON DELETE CASCADE,
  product_id uuid,
  description text NOT NULL,
  hsn_code text,
  quantity numeric(12,3) NOT NULL,
  unit text DEFAULT 'pcs',
  rate numeric(14,4) NOT NULL,
  discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  taxable_value numeric(14,2) NOT NULL,
  gst_pct numeric(5,2) NOT NULL DEFAULT 0,
  cgst numeric(14,2) NOT NULL DEFAULT 0,
  sgst numeric(14,2) NOT NULL DEFAULT 0,
  igst numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wholesale_invoice_items TO authenticated;
GRANT ALL ON public.wholesale_invoice_items TO service_role;
ALTER TABLE public.wholesale_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View invoice items via parent" ON public.wholesale_invoice_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wholesale_invoices wi
      JOIN public.wholesaler_accounts wa ON wa.id = wi.wholesaler_id
      WHERE wi.id = wholesale_invoice_items.invoice_id
        AND (wa.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins manage invoice items" ON public.wholesale_invoice_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_winv_items_invoice ON public.wholesale_invoice_items(invoice_id);

-- ============ wholesale_payments ============
CREATE TABLE IF NOT EXISTS public.wholesale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.wholesale_invoices(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  mode text NOT NULL CHECK (mode IN ('bank_transfer','upi','cheque','cash','online','adjustment')),
  reference_number text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wholesale_payments TO authenticated;
GRANT ALL ON public.wholesale_payments TO service_role;
ALTER TABLE public.wholesale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers view own payments" ON public.wholesale_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.wholesaler_accounts wa
            WHERE wa.id = wholesale_payments.wholesaler_id AND wa.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage payments" ON public.wholesale_payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_wpay_wholesaler ON public.wholesale_payments(wholesaler_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_wpay_invoice ON public.wholesale_payments(invoice_id);

-- ============ wholesale_payment_reminders ============
CREATE TABLE IF NOT EXISTS public.wholesale_payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.wholesale_invoices(id) ON DELETE CASCADE,
  wholesaler_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp','push','call')),
  scheduled_for timestamptz NOT NULL,
  days_offset integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','failed','cancelled','skipped')),
  sent_at timestamptz,
  template_key text,
  payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wholesale_payment_reminders TO authenticated;
GRANT ALL ON public.wholesale_payment_reminders TO service_role;
ALTER TABLE public.wholesale_payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers view own reminders" ON public.wholesale_payment_reminders
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.wholesaler_accounts wa
            WHERE wa.id = wholesale_payment_reminders.wholesaler_id AND wa.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage reminders" ON public.wholesale_payment_reminders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_wrem_due ON public.wholesale_payment_reminders(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_wrem_invoice ON public.wholesale_payment_reminders(invoice_id);

-- ============ Triggers: updated_at ============
DROP TRIGGER IF EXISTS trg_winv_updated ON public.wholesale_invoices;
CREATE TRIGGER trg_winv_updated BEFORE UPDATE ON public.wholesale_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_wpay_updated ON public.wholesale_payments;
CREATE TRIGGER trg_wpay_updated BEFORE UPDATE ON public.wholesale_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_wrem_updated ON public.wholesale_payment_reminders;
CREATE TRIGGER trg_wrem_updated BEFORE UPDATE ON public.wholesale_payment_reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Ledger running balance + outstanding sync trigger ============
CREATE OR REPLACE FUNCTION public.wholesale_ledger_apply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev numeric(14,2);
  v_delta numeric(14,2);
BEGIN
  SELECT COALESCE(current_outstanding, 0) INTO v_prev
    FROM public.wholesaler_accounts WHERE id = NEW.wholesaler_id FOR UPDATE;

  IF NEW.direction = 'debit' THEN
    v_delta := NEW.amount;
  ELSE
    v_delta := -NEW.amount;
  END IF;

  NEW.balance_after := v_prev + v_delta;

  UPDATE public.wholesaler_accounts
    SET current_outstanding = NEW.balance_after,
        updated_at = now()
    WHERE id = NEW.wholesaler_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wcl_apply ON public.wholesale_credit_ledger;
CREATE TRIGGER trg_wcl_apply BEFORE INSERT ON public.wholesale_credit_ledger
FOR EACH ROW EXECUTE FUNCTION public.wholesale_ledger_apply();

-- ============ Invoice issued -> ledger charge ============
CREATE OR REPLACE FUNCTION public.wholesale_invoice_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('issued','partial','overdue','paid'))
     OR (TG_OP = 'UPDATE' AND OLD.status = 'draft' AND NEW.status <> 'draft') THEN
    -- only if not already posted
    IF NOT EXISTS (
      SELECT 1 FROM public.wholesale_credit_ledger
      WHERE invoice_id = NEW.id AND entry_type = 'charge'
    ) THEN
      INSERT INTO public.wholesale_credit_ledger(
        wholesaler_id, entry_type, amount, direction,
        reference_type, reference_id, invoice_id, order_id, notes
      ) VALUES (
        NEW.wholesaler_id, 'charge', NEW.grand_total, 'debit',
        'invoice', NEW.id, NEW.id, NEW.order_id,
        'Invoice ' || NEW.invoice_number
      );
    END IF;
  END IF;
  NEW.amount_due := GREATEST(NEW.grand_total - COALESCE(NEW.amount_paid,0), 0);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_winv_post ON public.wholesale_invoices;
CREATE TRIGGER trg_winv_post BEFORE INSERT OR UPDATE ON public.wholesale_invoices
FOR EACH ROW EXECUTE FUNCTION public.wholesale_invoice_post();

-- ============ Payment verified -> ledger credit + invoice update ============
CREATE OR REPLACE FUNCTION public.wholesale_payment_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total numeric(14,2);
  v_paid numeric(14,2);
BEGIN
  IF NEW.verified = true AND (TG_OP = 'INSERT' OR OLD.verified = false) THEN
    -- already-posted guard
    IF NOT EXISTS (
      SELECT 1 FROM public.wholesale_credit_ledger
      WHERE reference_type = 'payment' AND reference_id = NEW.id
    ) THEN
      INSERT INTO public.wholesale_credit_ledger(
        wholesaler_id, entry_type, amount, direction,
        reference_type, reference_id, invoice_id, notes
      ) VALUES (
        NEW.wholesaler_id, 'payment', NEW.amount, 'credit',
        'payment', NEW.id, NEW.invoice_id,
        'Payment ' || COALESCE(NEW.reference_number, NEW.mode)
      );
    END IF;

    IF NEW.invoice_id IS NOT NULL THEN
      SELECT grand_total INTO v_total FROM public.wholesale_invoices WHERE id = NEW.invoice_id FOR UPDATE;
      SELECT COALESCE(SUM(amount),0) INTO v_paid
        FROM public.wholesale_payments
        WHERE invoice_id = NEW.invoice_id AND verified = true;
      UPDATE public.wholesale_invoices
        SET amount_paid = v_paid,
            amount_due = GREATEST(v_total - v_paid, 0),
            status = CASE
              WHEN v_paid >= v_total THEN 'paid'
              WHEN v_paid > 0 THEN 'partial'
              ELSE status
            END,
            updated_at = now()
        WHERE id = NEW.invoice_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wpay_post ON public.wholesale_payments;
CREATE TRIGGER trg_wpay_post AFTER INSERT OR UPDATE ON public.wholesale_payments
FOR EACH ROW EXECUTE FUNCTION public.wholesale_payment_post();

-- ============ Helper RPCs ============
CREATE OR REPLACE FUNCTION public.get_wholesaler_outstanding(_wholesaler_id uuid)
RETURNS TABLE(outstanding numeric, overdue numeric, invoice_count integer, overdue_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(amount_due),0)::numeric AS outstanding,
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND amount_due > 0 THEN amount_due ELSE 0 END),0)::numeric AS overdue,
    COUNT(*) FILTER (WHERE amount_due > 0)::int AS invoice_count,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND amount_due > 0)::int AS overdue_count
  FROM public.wholesale_invoices
  WHERE wholesaler_id = _wholesaler_id
    AND status <> 'void';
$$;

CREATE OR REPLACE FUNCTION public.get_wholesaler_available_credit(_wholesaler_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
    COALESCE((SELECT credit_limit FROM public.wholesaler_accounts WHERE id = _wholesaler_id), 0)
    - COALESCE((SELECT outstanding FROM public.get_wholesaler_outstanding(_wholesaler_id)), 0),
    0
  );
$$;

-- ============ Invoice number generator ============
CREATE SEQUENCE IF NOT EXISTS public.wholesale_invoice_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_wholesale_invoice_number()
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'WINV-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.wholesale_invoice_seq')::text, 6, '0');
$$;

-- ============ Overdue marker (callable by cron) ============
CREATE OR REPLACE FUNCTION public.mark_overdue_wholesale_invoices()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  UPDATE public.wholesale_invoices
    SET status = 'overdue', updated_at = now()
    WHERE status IN ('issued','partial')
      AND due_date < CURRENT_DATE
      AND amount_due > 0;
  GET DIAGNOSTICS c = ROW_COUNT;
  RETURN c;
END $$;
