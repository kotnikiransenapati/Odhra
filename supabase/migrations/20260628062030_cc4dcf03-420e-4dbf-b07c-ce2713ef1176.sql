
-- GMA5: Multivariate experimentation engine
CREATE TABLE IF NOT EXISTS public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed')),
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_metric text NOT NULL DEFAULT 'conversion',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.experiments TO anon, authenticated;
GRANT ALL ON public.experiments TO service_role;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read running experiments" ON public.experiments
  FOR SELECT TO anon, authenticated USING (status IN ('running','paused','completed'));
CREATE POLICY "admins manage experiments" ON public.experiments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id text,
  variant text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_key, user_id, anonymous_id)
);
CREATE INDEX IF NOT EXISTS idx_exp_assign_key ON public.experiment_assignments(experiment_key);
GRANT SELECT, INSERT ON public.experiment_assignments TO authenticated;
GRANT INSERT ON public.experiment_assignments TO anon;
GRANT ALL ON public.experiment_assignments TO service_role;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own assignments" ON public.experiment_assignments
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "anon insert assignments" ON public.experiment_assignments
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "users read own assignments" ON public.experiment_assignments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read assignments" ON public.experiment_assignments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.experiment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key text NOT NULL,
  variant text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('exposure','conversion')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id text,
  value numeric,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exp_events_key_var ON public.experiment_events(experiment_key, variant);
GRANT INSERT ON public.experiment_events TO anon, authenticated;
GRANT SELECT ON public.experiment_events TO authenticated;
GRANT ALL ON public.experiment_events TO service_role;
ALTER TABLE public.experiment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert experiment events" ON public.experiment_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read experiment events" ON public.experiment_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE VIEW public.experiment_results AS
  SELECT
    experiment_key,
    variant,
    COUNT(*) FILTER (WHERE event_type='exposure')::int AS exposures,
    COUNT(*) FILTER (WHERE event_type='conversion')::int AS conversions,
    CASE WHEN COUNT(*) FILTER (WHERE event_type='exposure') > 0
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE event_type='conversion')
                / COUNT(*) FILTER (WHERE event_type='exposure'), 2)
      ELSE 0 END AS conversion_rate_pct,
    SUM(value) FILTER (WHERE event_type='conversion') AS total_value
  FROM public.experiment_events
  GROUP BY experiment_key, variant;
GRANT SELECT ON public.experiment_results TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_experiment_variant(_key text, _anon_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _exp record;
  _existing text;
  _variants jsonb;
  _total numeric := 0;
  _r numeric;
  _acc numeric := 0;
  _v jsonb;
  _chosen text;
BEGIN
  SELECT * INTO _exp FROM public.experiments WHERE key = _key AND status = 'running';
  IF _exp IS NULL THEN RETURN NULL; END IF;

  SELECT variant INTO _existing FROM public.experiment_assignments
  WHERE experiment_key = _key
    AND (( _uid IS NOT NULL AND user_id = _uid)
      OR ( _uid IS NULL AND anonymous_id = _anon_id))
  LIMIT 1;
  IF _existing IS NOT NULL THEN
    INSERT INTO public.experiment_events(experiment_key, variant, event_type, user_id, anonymous_id)
    VALUES (_key, _existing, 'exposure', _uid, _anon_id);
    RETURN _existing;
  END IF;

  _variants := _exp.variants;
  FOR _v IN SELECT * FROM jsonb_array_elements(_variants) LOOP
    _total := _total + COALESCE((_v->>'weight')::numeric, 1);
  END LOOP;
  IF _total <= 0 THEN _total := 1; END IF;

  _r := random() * _total;
  FOR _v IN SELECT * FROM jsonb_array_elements(_variants) LOOP
    _acc := _acc + COALESCE((_v->>'weight')::numeric, 1);
    IF _r <= _acc THEN
      _chosen := _v->>'name';
      EXIT;
    END IF;
  END LOOP;

  IF _chosen IS NULL THEN _chosen := (_variants->0)->>'name'; END IF;

  INSERT INTO public.experiment_assignments(experiment_key, user_id, anonymous_id, variant)
  VALUES (_key, _uid, _anon_id, _chosen)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.experiment_events(experiment_key, variant, event_type, user_id, anonymous_id)
  VALUES (_key, _chosen, 'exposure', _uid, _anon_id);

  RETURN _chosen;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_experiment_variant(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.assign_experiment_variant(text,text) TO anon, authenticated;

-- GMA6: Promo budget governor
CREATE TABLE IF NOT EXISTS public.promo_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  daily_limit numeric,
  total_limit numeric,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  spent_today numeric NOT NULL DEFAULT 0,
  spent_total numeric NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_budgets TO authenticated;
GRANT ALL ON public.promo_budgets TO service_role;
ALTER TABLE public.promo_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage promo budgets" ON public.promo_budgets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.try_consume_promo_budget(_code text, _amount numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _b record;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN true; END IF;

  SELECT * INTO _b FROM public.promo_budgets WHERE code = _code FOR UPDATE;
  IF _b IS NULL THEN RETURN true; END IF; -- no governor configured

  -- Reset daily window
  IF _b.period_start < CURRENT_DATE THEN
    UPDATE public.promo_budgets
    SET period_start = CURRENT_DATE, spent_today = 0
    WHERE id = _b.id;
    _b.spent_today := 0;
  END IF;

  IF _b.daily_limit IS NOT NULL AND (_b.spent_today + _amount) > _b.daily_limit THEN
    RETURN false;
  END IF;
  IF _b.total_limit IS NOT NULL AND (_b.spent_total + _amount) > _b.total_limit THEN
    RETURN false;
  END IF;

  UPDATE public.promo_budgets
  SET spent_today = spent_today + _amount,
      spent_total = spent_total + _amount,
      last_updated = now()
  WHERE id = _b.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.try_consume_promo_budget(text,numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.try_consume_promo_budget(text,numeric) TO authenticated, service_role;
