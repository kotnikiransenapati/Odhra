
CREATE TABLE IF NOT EXISTS public.loyalty_tier_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scenario_name text NOT NULL,
  proposed_tiers jsonb NOT NULL,
  baseline_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  projected_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  uplift_pct numeric,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_tier_simulations TO authenticated;
GRANT ALL ON public.loyalty_tier_simulations TO service_role;
ALTER TABLE public.loyalty_tier_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage tier sims" ON public.loyalty_tier_simulations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_loyalty_tier_sims_updated
  BEFORE UPDATE ON public.loyalty_tier_simulations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.simulate_loyalty_tiers(_tiers jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  tier jsonb;
  customer_count int;
  total_spend numeric;
  total_customers int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  SELECT COUNT(DISTINCT user_id) INTO total_customers
  FROM public.orders WHERE payment_status = 'paid';
  FOR tier IN SELECT * FROM jsonb_array_elements(_tiers) LOOP
    SELECT COUNT(*), COALESCE(SUM(spend),0)
    INTO customer_count, total_spend
    FROM (
      SELECT user_id, SUM(total_amount) AS spend
      FROM public.orders
      WHERE payment_status = 'paid'
        AND created_at >= now() - ((tier->>'window_days')::int || ' days')::interval
      GROUP BY user_id
      HAVING SUM(total_amount) >= (tier->>'min_spend')::numeric
         AND SUM(total_amount) < COALESCE((tier->>'max_spend')::numeric, 1e12)
    ) s;
    result := result || jsonb_build_object(
      'tier_name', tier->>'name',
      'min_spend', tier->>'min_spend',
      'customers', customer_count,
      'pct_of_base', CASE WHEN total_customers > 0 THEN ROUND(100.0 * customer_count / total_customers, 2) ELSE 0 END,
      'total_spend', total_spend,
      'projected_reward_cost', ROUND(total_spend * COALESCE((tier->>'reward_pct')::numeric, 0) / 100.0, 2)
    );
  END LOOP;
  RETURN jsonb_build_object('total_customers', total_customers, 'tiers', result, 'simulated_at', now());
END;
$$;
REVOKE ALL ON FUNCTION public.simulate_loyalty_tiers(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.simulate_loyalty_tiers(jsonb) TO authenticated;

CREATE TABLE IF NOT EXISTS public.cross_channel_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('email','phone','user_id','device_token')),
  channel text NOT NULL CHECK (channel IN ('email','sms','push','whatsapp','all')),
  reason text NOT NULL,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  suppressed_until timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier, identifier_type, channel)
);
CREATE INDEX IF NOT EXISTS idx_xchan_suppr_lookup
  ON public.cross_channel_suppressions (identifier_type, identifier, channel);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cross_channel_suppressions TO authenticated;
GRANT ALL ON public.cross_channel_suppressions TO service_role;
ALTER TABLE public.cross_channel_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage suppressions" ON public.cross_channel_suppressions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users see their own suppressions" ON public.cross_channel_suppressions
  FOR SELECT TO authenticated
  USING (
    (identifier_type = 'user_id' AND identifier = auth.uid()::text)
    OR (identifier_type = 'email' AND identifier = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );
CREATE TRIGGER trg_xchan_suppr_updated
  BEFORE UPDATE ON public.cross_channel_suppressions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_suppressed(_identifier text, _identifier_type text, _channel text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cross_channel_suppressions
    WHERE identifier = _identifier
      AND identifier_type = _identifier_type
      AND channel IN (_channel, 'all')
      AND (suppressed_until IS NULL OR suppressed_until > now())
  );
$$;
REVOKE ALL ON FUNCTION public.is_suppressed(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_suppressed(text,text,text) TO authenticated, anon, service_role;
