-- DAI3 + DAI4 hardening: AI support copilot storage and customer intelligence scoring fixes

-- Ensure existing support tables are reachable through the authenticated Data API while RLS remains authoritative.
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

CREATE TABLE public.ai_support_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','customer','system')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','used','dismissed','expired')),
  summary TEXT NOT NULL DEFAULT '',
  suggested_reply TEXT NOT NULL DEFAULT '',
  sentiment TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','frustrated','angry','urgent')),
  urgency_score INTEGER NOT NULL DEFAULT 0 CHECK (urgency_score >= 0 AND urgency_score <= 100),
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  ai_run_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ai_support_suggestions TO authenticated;
GRANT ALL ON public.ai_support_suggestions TO service_role;
ALTER TABLE public.ai_support_suggestions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_support_suggestions_ticket ON public.ai_support_suggestions(ticket_id, created_at DESC);
CREATE INDEX idx_ai_support_suggestions_status ON public.ai_support_suggestions(status, expires_at);

CREATE POLICY "Ticket owners read own AI suggestions"
ON public.ai_support_suggestions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ai_support_suggestions.ticket_id
      AND st.user_id = auth.uid()
  )
);

CREATE POLICY "Support admins read AI suggestions"
ON public.ai_support_suggestions
FOR SELECT TO authenticated
USING (public.admin_has_permission(auth.uid(), 'view_tickets'));

CREATE POLICY "Authenticated users request AI suggestions for own tickets"
ON public.ai_support_suggestions
FOR INSERT TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ai_support_suggestions.ticket_id
      AND st.user_id = auth.uid()
  )
);

CREATE POLICY "Support admins manage AI suggestions"
ON public.ai_support_suggestions
FOR ALL TO authenticated
USING (public.admin_has_permission(auth.uid(), 'manage_tickets'))
WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_tickets'));

CREATE TRIGGER trg_ai_support_suggestions_updated
BEFORE UPDATE ON public.ai_support_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_ticket_copilot_context(_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket JSONB;
  v_messages JSONB;
  v_customer JSONB;
  v_orders JSONB;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_tickets') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT to_jsonb(st) INTO v_ticket
  FROM public.support_tickets st
  WHERE st.id = _ticket_id;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'ticket_not_found';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'message', left(m.message, 2000),
    'is_staff_reply', m.is_staff_reply,
    'created_at', m.created_at
  ) ORDER BY m.created_at ASC), '[]'::jsonb)
  INTO v_messages
  FROM public.support_ticket_messages m
  WHERE m.ticket_id = _ticket_id;

  SELECT jsonb_build_object(
    'full_name', p.full_name,
    'created_at', p.created_at,
    'state', COALESCE(p.state, '')
  ) INTO v_customer
  FROM public.profiles p
  WHERE p.id = (v_ticket->>'user_id')::uuid;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status::text,
    'payment_status', o.payment_status::text,
    'total_amount', o.total_amount,
    'created_at', o.created_at
  ) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_orders
  FROM public.orders o
  WHERE o.customer_id = (v_ticket->>'user_id')::uuid
  LIMIT 5;

  RETURN jsonb_build_object(
    'ticket', v_ticket - 'attachments',
    'messages', v_messages,
    'customer', COALESCE(v_customer, '{}'::jsonb),
    'recent_orders', COALESCE(v_orders, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ticket_ai_suggestions(_ticket_id UUID)
RETURNS SETOF public.ai_support_suggestions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.ai_support_suggestions s
  WHERE s.ticket_id = _ticket_id
    AND s.expires_at > now()
    AND (
      public.admin_has_permission(auth.uid(), 'view_tickets')
      OR EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = s.ticket_id
          AND st.user_id = auth.uid()
      )
    )
  ORDER BY s.created_at DESC;
$$;

-- Fix earlier risk scoring to use the real orders.customer_id column and login_attempts.attempted_at schema.
CREATE OR REPLACE FUNCTION public.compute_customer_risk_score(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_payments INT := 0;
  v_returns INT := 0;
  v_orders INT := 0;
  v_account_age_days INT := 0;
  v_login_failures INT := 0;
  v_score INT := 0;
  v_tier TEXT;
  v_factors JSONB;
  v_existing RECORD;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_fraud_signals') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO v_orders
  FROM public.orders
  WHERE customer_id = _user_id;

  SELECT COUNT(*) INTO v_failed_payments
  FROM public.orders
  WHERE customer_id = _user_id
    AND payment_status::text IN ('failed','failure','declined');

  SELECT COUNT(*) INTO v_returns
  FROM public.return_requests
  WHERE customer_id = _user_id;

  SELECT COALESCE(EXTRACT(DAY FROM now() - created_at)::INT, 0)
  INTO v_account_age_days
  FROM auth.users
  WHERE id = _user_id;

  -- login_attempts intentionally stores privacy-preserving hashes and no user_id, so direct per-user linking is not used here.
  v_login_failures := 0;

  v_score := LEAST(100,
    (v_failed_payments * 8) +
    (CASE WHEN v_orders > 0 THEN (v_returns * 100 / GREATEST(v_orders,1)) / 4 ELSE 0 END) +
    (LEAST(v_login_failures, 10) * 3) +
    (CASE WHEN v_account_age_days < 7 THEN 15 WHEN v_account_age_days < 30 THEN 5 ELSE 0 END)
  );
  v_tier := public.derive_risk_tier(v_score);
  v_factors := jsonb_build_object(
    'orders', v_orders,
    'failed_payments', v_failed_payments,
    'returns', v_returns,
    'account_age_days', v_account_age_days,
    'login_failures_30d', v_login_failures,
    'schema_version', 2
  );

  SELECT score, tier INTO v_existing
  FROM public.customer_risk_scores
  WHERE user_id = _user_id;

  INSERT INTO public.customer_risk_scores (user_id, score, tier, factors, last_computed_at)
  VALUES (_user_id, v_score, v_tier, v_factors, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = CASE WHEN customer_risk_scores.manual_override THEN customer_risk_scores.score ELSE EXCLUDED.score END,
    tier = CASE WHEN customer_risk_scores.manual_override THEN customer_risk_scores.tier ELSE EXCLUDED.tier END,
    factors = EXCLUDED.factors,
    last_computed_at = now();

  IF v_existing.score IS DISTINCT FROM v_score THEN
    INSERT INTO public.customer_risk_events(user_id, old_score, new_score, old_tier, new_tier, reason, changed_by, metadata)
    VALUES (_user_id, v_existing.score, v_score, v_existing.tier, v_tier, 'auto_recompute_v2', auth.uid(), v_factors);
  END IF;

  RETURN jsonb_build_object('score', v_score, 'tier', v_tier, 'factors', v_factors);
END;
$$;