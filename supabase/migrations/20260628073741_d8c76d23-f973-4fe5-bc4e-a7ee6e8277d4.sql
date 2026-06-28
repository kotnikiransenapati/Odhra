
CREATE TABLE IF NOT EXISTS public.wholesale_kam_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_account_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  notes text,
  task_type text NOT NULL DEFAULT 'followup',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  due_date timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kam_tasks_account ON public.wholesale_kam_tasks(wholesaler_account_id);
CREATE INDEX IF NOT EXISTS idx_kam_tasks_assignee ON public.wholesale_kam_tasks(assigned_to, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_kam_tasks TO authenticated;
GRANT ALL ON public.wholesale_kam_tasks TO service_role;
ALTER TABLE public.wholesale_kam_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage KAM tasks" ON public.wholesale_kam_tasks;
CREATE POLICY "Admins manage KAM tasks" ON public.wholesale_kam_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_kam_tasks_updated ON public.wholesale_kam_tasks;
CREATE TRIGGER trg_kam_tasks_updated BEFORE UPDATE ON public.wholesale_kam_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.wholesale_kam_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_account_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'call',
  subject text,
  body text NOT NULL,
  next_action_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kam_notes_account ON public.wholesale_kam_notes(wholesaler_account_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_kam_notes TO authenticated;
GRANT ALL ON public.wholesale_kam_notes TO service_role;
ALTER TABLE public.wholesale_kam_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage KAM notes" ON public.wholesale_kam_notes;
CREATE POLICY "Admins manage KAM notes" ON public.wholesale_kam_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_kam_notes_updated ON public.wholesale_kam_notes;
CREATE TRIGGER trg_kam_notes_updated BEFORE UPDATE ON public.wholesale_kam_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.wholesale_slo_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  apply_to_approve_p50_hours numeric,
  apply_to_approve_p95_hours numeric,
  order_to_invoice_p50_hours numeric,
  order_to_invoice_p95_hours numeric,
  invoice_to_paid_p50_days numeric,
  invoice_to_paid_p95_days numeric,
  sample_size integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slo_snapshots_captured ON public.wholesale_slo_snapshots(captured_at DESC);
GRANT SELECT ON public.wholesale_slo_snapshots TO authenticated;
GRANT ALL ON public.wholesale_slo_snapshots TO service_role;
ALTER TABLE public.wholesale_slo_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read SLO snapshots" ON public.wholesale_slo_snapshots;
CREATE POLICY "Admins read SLO snapshots" ON public.wholesale_slo_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== Customer 360 RPC =====
CREATE OR REPLACE FUNCTION public.wholesale_customer_360(_account_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acct public.wholesaler_accounts;
  v_total_revenue numeric := 0;
  v_total_invoices integer := 0;
  v_last_invoice timestamptz;
  v_overdue numeric := 0;
  v_outstanding numeric := 0;
  v_dso numeric := 0;
  v_aging jsonb;
  v_credit_util numeric := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_acct FROM public.wholesaler_accounts WHERE id = _account_id;
  IF v_acct.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT
    COALESCE(SUM(grand_total), 0),
    COUNT(*),
    MAX(issue_date)
  INTO v_total_revenue, v_total_invoices, v_last_invoice
  FROM public.wholesale_invoices
  WHERE wholesaler_id = _account_id;

  SELECT COALESCE(SUM(amount_due), 0)
  INTO v_outstanding
  FROM public.wholesale_invoices
  WHERE wholesaler_id = _account_id AND status IN ('issued','partially_paid','overdue');

  SELECT COALESCE(SUM(amount_due), 0)
  INTO v_overdue
  FROM public.wholesale_invoices
  WHERE wholesaler_id = _account_id AND status = 'overdue';

  IF v_total_revenue > 0 THEN
    v_dso := ROUND((v_outstanding / (v_total_revenue / 365.0))::numeric, 1);
  END IF;

  IF v_acct.credit_limit > 0 THEN
    v_credit_util := ROUND(((v_acct.credit_used / v_acct.credit_limit) * 100)::numeric, 1);
  END IF;

  SELECT jsonb_build_object(
    'bucket_0_30',   COALESCE(SUM(CASE WHEN (now()::date - due_date::date) BETWEEN 0 AND 30 THEN amount_due ELSE 0 END), 0),
    'bucket_31_60',  COALESCE(SUM(CASE WHEN (now()::date - due_date::date) BETWEEN 31 AND 60 THEN amount_due ELSE 0 END), 0),
    'bucket_61_90',  COALESCE(SUM(CASE WHEN (now()::date - due_date::date) BETWEEN 61 AND 90 THEN amount_due ELSE 0 END), 0),
    'bucket_90_plus',COALESCE(SUM(CASE WHEN (now()::date - due_date::date) > 90 THEN amount_due ELSE 0 END), 0)
  ) INTO v_aging
  FROM public.wholesale_invoices
  WHERE wholesaler_id = _account_id AND status IN ('issued','partially_paid','overdue');

  RETURN jsonb_build_object(
    'account_id', v_acct.id,
    'business_name', v_acct.business_name,
    'tier', v_acct.tier,
    'status', v_acct.status,
    'credit_limit', v_acct.credit_limit,
    'credit_used', v_acct.credit_used,
    'credit_utilization_pct', v_credit_util,
    'payment_terms_days', v_acct.payment_terms_days,
    'total_invoices', v_total_invoices,
    'lifetime_revenue', v_total_revenue,
    'outstanding_amount', v_outstanding,
    'overdue_amount', v_overdue,
    'last_invoice_at', v_last_invoice,
    'dso_days', v_dso,
    'aging', COALESCE(v_aging, '{}'::jsonb)
  );
END;
$$;

-- ===== AR Aging Report RPC =====
CREATE OR REPLACE FUNCTION public.wholesale_ar_aging_report()
RETURNS TABLE (
  account_id uuid,
  business_name text,
  tier text,
  outstanding numeric,
  bucket_0_30 numeric,
  bucket_31_60 numeric,
  bucket_61_90 numeric,
  bucket_90_plus numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.business_name,
    a.tier,
    COALESCE(SUM(i.amount_due), 0) AS outstanding,
    COALESCE(SUM(CASE WHEN (now()::date - i.due_date::date) BETWEEN 0 AND 30 THEN i.amount_due ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (now()::date - i.due_date::date) BETWEEN 31 AND 60 THEN i.amount_due ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (now()::date - i.due_date::date) BETWEEN 61 AND 90 THEN i.amount_due ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (now()::date - i.due_date::date) > 90 THEN i.amount_due ELSE 0 END), 0)
  FROM public.wholesaler_accounts a
  LEFT JOIN public.wholesale_invoices i
    ON i.wholesaler_id = a.id
   AND i.status IN ('issued','partially_paid','overdue')
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY a.id, a.business_name, a.tier
  HAVING COALESCE(SUM(i.amount_due), 0) > 0
  ORDER BY outstanding DESC;
$$;

-- ===== SLO Compute RPC =====
CREATE OR REPLACE FUNCTION public.wholesale_slo_compute()
RETURNS public.wholesale_slo_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.wholesale_slo_snapshots;
  v_a50 numeric; v_a95 numeric;
  v_o50 numeric; v_o95 numeric;
  v_p50 numeric; v_p95 numeric;
  v_n integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600.0),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600.0)
  INTO v_a50, v_a95
  FROM public.wholesaler_accounts
  WHERE approved_at IS NOT NULL AND approved_at > now() - interval '90 days';

  SELECT
    percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (issue_date - created_at)) / 3600.0),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (issue_date - created_at)) / 3600.0)
  INTO v_o50, v_o95
  FROM public.wholesale_invoices
  WHERE issue_date IS NOT NULL AND issue_date > now() - interval '90 days';

  SELECT
    percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - issue_date)) / 86400.0),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - issue_date)) / 86400.0),
    COUNT(*)
  INTO v_p50, v_p95, v_n
  FROM public.wholesale_invoices
  WHERE status = 'paid' AND updated_at > now() - interval '90 days';

  INSERT INTO public.wholesale_slo_snapshots (
    apply_to_approve_p50_hours, apply_to_approve_p95_hours,
    order_to_invoice_p50_hours, order_to_invoice_p95_hours,
    invoice_to_paid_p50_days, invoice_to_paid_p95_days,
    sample_size
  ) VALUES (
    ROUND(COALESCE(v_a50,0)::numeric, 2), ROUND(COALESCE(v_a95,0)::numeric, 2),
    ROUND(COALESCE(v_o50,0)::numeric, 2), ROUND(COALESCE(v_o95,0)::numeric, 2),
    ROUND(COALESCE(v_p50,0)::numeric, 2), ROUND(COALESCE(v_p95,0)::numeric, 2),
    COALESCE(v_n, 0)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.wholesale_customer_360(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wholesale_customer_360(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.wholesale_ar_aging_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wholesale_ar_aging_report() TO authenticated;
REVOKE ALL ON FUNCTION public.wholesale_slo_compute() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wholesale_slo_compute() TO authenticated;
