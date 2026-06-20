
-- Batch K1 — Payments hardening tables.

CREATE TABLE IF NOT EXISTS public.vendor_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  linked_account_id TEXT NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending','active','suspended','rejected')),
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  hold_funds BOOLEAN NOT NULL DEFAULT false,
  kyc_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_payout_accounts TO authenticated;
GRANT ALL ON public.vendor_payout_accounts TO service_role;
ALTER TABLE public.vendor_payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payout accounts" ON public.vendor_payout_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors view their payout account" ON public.vendor_payout_accounts FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE TRIGGER trg_vendor_payout_accounts_updated_at BEFORE UPDATE ON public.vendor_payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.payment_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  razorpay_payment_id TEXT,
  razorpay_transfer_id TEXT UNIQUE,
  linked_account_id TEXT NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  commission_paise BIGINT NOT NULL DEFAULT 0 CHECK (commission_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','processed','failed','reversed','on_hold')),
  on_hold BOOLEAN NOT NULL DEFAULT false,
  on_hold_until TIMESTAMPTZ,
  failure_reason TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_order ON public.payment_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_vendor ON public.payment_transfers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_status ON public.payment_transfers(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transfers TO authenticated;
GRANT ALL ON public.payment_transfers TO service_role;
ALTER TABLE public.payment_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage transfers" ON public.payment_transfers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors view own transfers" ON public.payment_transfers FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));
CREATE TRIGGER trg_payment_transfers_updated_at BEFORE UPDATE ON public.payment_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT NOT NULL,
  razorpay_refund_id TEXT UNIQUE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  refund_type TEXT NOT NULL DEFAULT 'partial' CHECK (refund_type IN ('partial','full','reverse_transfer')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  initiated_by UUID,
  reverse_transfers JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_order ON public.payment_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON public.payment_refunds(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_refunds TO authenticated;
GRANT ALL ON public.payment_refunds TO service_role;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage refunds" ON public.payment_refunds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers view their refunds" ON public.payment_refunds FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));
CREATE TRIGGER trg_payment_refunds_updated_at BEFORE UPDATE ON public.payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  razorpay_payment_id TEXT NOT NULL,
  razorpay_dispute_id TEXT UNIQUE NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  reason_code TEXT,
  reason_description TEXT,
  phase TEXT NOT NULL DEFAULT 'chargeback' CHECK (phase IN ('fraud','chargeback','retrieval','pre_arbitration','arbitration')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','won','lost','closed')),
  respond_by TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_to UUID,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON public.payment_disputes(status);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_respond_by ON public.payment_disputes(respond_by);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_disputes TO authenticated;
GRANT ALL ON public.payment_disputes TO service_role;
ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage disputes" ON public.payment_disputes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_payment_disputes_updated_at BEFORE UPDATE ON public.payment_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.payment_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  payments_checked INTEGER NOT NULL DEFAULT 0,
  matches INTEGER NOT NULL DEFAULT 0,
  mismatches INTEGER NOT NULL DEFAULT 0,
  amount_delta_paise BIGINT NOT NULL DEFAULT 0,
  mismatch_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','partial','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_reconciliation_runs TO authenticated;
GRANT ALL ON public.payment_reconciliation_runs TO service_role;
ALTER TABLE public.payment_reconciliation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view reconciliation" ON public.payment_reconciliation_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
