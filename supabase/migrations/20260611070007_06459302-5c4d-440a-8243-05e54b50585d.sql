
-- ============================================================
-- BATCH 63: CUSTOMER RISK SCORING
-- ============================================================
CREATE TABLE public.customer_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  tier TEXT NOT NULL DEFAULT 'low' CHECK (tier IN ('low','medium','high','critical')),
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  manual_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crs_tier ON public.customer_risk_scores(tier);
CREATE INDEX idx_crs_score ON public.customer_risk_scores(score DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_risk_scores TO authenticated;
GRANT ALL ON public.customer_risk_scores TO service_role;
ALTER TABLE public.customer_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read risk scores" ON public.customer_risk_scores FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_fraud_signals'));
CREATE POLICY "Admins manage risk scores" ON public.customer_risk_scores FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_fraud_signals'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_fraud_signals'));

CREATE TABLE public.customer_risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_score INTEGER,
  new_score INTEGER NOT NULL,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  reason TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cre_user ON public.customer_risk_events(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.customer_risk_events TO authenticated;
GRANT ALL ON public.customer_risk_events TO service_role;
ALTER TABLE public.customer_risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read risk events" ON public.customer_risk_events FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_fraud_signals'));
CREATE POLICY "System inserts risk events" ON public.customer_risk_events FOR INSERT TO authenticated
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_fraud_signals'));

CREATE TRIGGER trg_crs_updated BEFORE UPDATE ON public.customer_risk_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.derive_risk_tier(_score INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _score >= 80 THEN 'critical'
    WHEN _score >= 60 THEN 'high'
    WHEN _score >= 30 THEN 'medium'
    ELSE 'low'
  END;
$$;

CREATE OR REPLACE FUNCTION public.compute_customer_risk_score(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_failed_payments INT := 0;
  v_chargebacks INT := 0;
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

  SELECT COUNT(*) INTO v_orders FROM public.orders WHERE user_id = _user_id;
  SELECT COUNT(*) INTO v_failed_payments FROM public.orders WHERE user_id = _user_id AND payment_status = 'failed';
  SELECT COUNT(*) INTO v_returns FROM public.return_requests WHERE customer_id = _user_id;
  SELECT EXTRACT(DAY FROM now() - created_at)::INT INTO v_account_age_days FROM auth.users WHERE id = _user_id;
  SELECT COUNT(*) INTO v_login_failures FROM public.login_attempts
    WHERE user_id = _user_id AND success = false AND created_at > now() - INTERVAL '30 days';

  -- Scoring weights
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
    'login_failures_30d', v_login_failures
  );

  SELECT score, tier INTO v_existing FROM public.customer_risk_scores WHERE user_id = _user_id;

  INSERT INTO public.customer_risk_scores (user_id, score, tier, factors, last_computed_at)
  VALUES (_user_id, v_score, v_tier, v_factors, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = CASE WHEN customer_risk_scores.manual_override THEN customer_risk_scores.score ELSE EXCLUDED.score END,
    tier = CASE WHEN customer_risk_scores.manual_override THEN customer_risk_scores.tier ELSE EXCLUDED.tier END,
    factors = EXCLUDED.factors,
    last_computed_at = now();

  IF v_existing.score IS DISTINCT FROM v_score THEN
    INSERT INTO public.customer_risk_events(user_id, old_score, new_score, old_tier, new_tier, reason, changed_by, metadata)
    VALUES (_user_id, v_existing.score, v_score, v_existing.tier, v_tier, 'auto_recompute', auth.uid(), v_factors);
  END IF;

  RETURN jsonb_build_object('score', v_score, 'tier', v_tier, 'factors', v_factors);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_override_risk_score(_user_id UUID, _score INTEGER, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old RECORD;
  v_tier TEXT;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_fraud_signals') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _score < 0 OR _score > 100 THEN RAISE EXCEPTION 'score out of range'; END IF;
  v_tier := public.derive_risk_tier(_score);
  SELECT score, tier INTO v_old FROM public.customer_risk_scores WHERE user_id = _user_id;

  INSERT INTO public.customer_risk_scores(user_id, score, tier, manual_override, override_reason, reviewed_by, reviewed_at, last_computed_at)
  VALUES (_user_id, _score, v_tier, true, _reason, auth.uid(), now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = _score, tier = v_tier, manual_override = true,
    override_reason = _reason, reviewed_by = auth.uid(), reviewed_at = now();

  INSERT INTO public.customer_risk_events(user_id, old_score, new_score, old_tier, new_tier, reason, changed_by)
  VALUES (_user_id, v_old.score, _score, v_old.tier, v_tier, COALESCE('manual: '||_reason, 'manual_override'), auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_risk_scores_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_fraud_signals') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN (SELECT jsonb_build_object(
    'total', COUNT(*),
    'critical', COUNT(*) FILTER (WHERE tier='critical'),
    'high', COUNT(*) FILTER (WHERE tier='high'),
    'medium', COUNT(*) FILTER (WHERE tier='medium'),
    'low', COUNT(*) FILTER (WHERE tier='low'),
    'overrides', COUNT(*) FILTER (WHERE manual_override),
    'avg_score', COALESCE(ROUND(AVG(score))::INT, 0)
  ) FROM public.customer_risk_scores);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_risk_scores_list(_tier TEXT DEFAULT NULL, _limit INT DEFAULT 100)
RETURNS TABLE(
  id UUID, user_id UUID, score INT, tier TEXT, factors JSONB,
  manual_override BOOLEAN, override_reason TEXT, last_computed_at TIMESTAMPTZ,
  email TEXT, full_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_fraud_signals') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT s.id, s.user_id, s.score, s.tier, s.factors, s.manual_override, s.override_reason,
         s.last_computed_at, u.email::TEXT, p.full_name
  FROM public.customer_risk_scores s
  LEFT JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE (_tier IS NULL OR s.tier = _tier)
  ORDER BY s.score DESC, s.last_computed_at DESC
  LIMIT _limit;
END;
$$;

-- ============================================================
-- BATCH 64: ADMIN BOOKMARKS
-- ============================================================
CREATE TABLE public.admin_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, path)
);
CREATE INDEX idx_ab_admin ON public.admin_bookmarks(admin_user_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_bookmarks TO authenticated;
GRANT ALL ON public.admin_bookmarks TO service_role;
ALTER TABLE public.admin_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own bookmarks" ON public.admin_bookmarks FOR ALL TO authenticated
  USING (admin_user_id = auth.uid()) WITH CHECK (admin_user_id = auth.uid());

CREATE TRIGGER trg_ab_updated BEFORE UPDATE ON public.admin_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.list_my_admin_bookmarks()
RETURNS SETOF public.admin_bookmarks LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.admin_bookmarks WHERE admin_user_id = auth.uid()
  ORDER BY sort_order ASC, created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.upsert_my_admin_bookmark(_label TEXT, _path TEXT, _icon TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF length(coalesce(_label,'')) = 0 OR length(coalesce(_path,'')) = 0 THEN
    RAISE EXCEPTION 'label and path required';
  END IF;
  INSERT INTO public.admin_bookmarks(admin_user_id, label, path, icon)
  VALUES (auth.uid(), _label, _path, _icon)
  ON CONFLICT (admin_user_id, path) DO UPDATE
  SET label = EXCLUDED.label, icon = EXCLUDED.icon, updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_admin_bookmark(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.admin_bookmarks WHERE id = _id AND admin_user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_my_admin_bookmarks(_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i INT;
BEGIN
  FOR i IN 1..array_length(_ids, 1) LOOP
    UPDATE public.admin_bookmarks SET sort_order = i, updated_at = now()
    WHERE id = _ids[i] AND admin_user_id = auth.uid();
  END LOOP;
END;
$$;
