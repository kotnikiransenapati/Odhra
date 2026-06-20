
CREATE TABLE IF NOT EXISTS public.rail_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  rail_key TEXT NOT NULL,
  product_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression','click','add_to_cart','purchase')),
  rank_position INTEGER,
  rule_id UUID REFERENCES public.merchandising_rules(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rail_interactions_rail ON public.rail_interactions(rail_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rail_interactions_product ON public.rail_interactions(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_rail_interactions_rule ON public.rail_interactions(rule_id) WHERE rule_id IS NOT NULL;

GRANT SELECT, INSERT ON public.rail_interactions TO anon, authenticated;
GRANT ALL ON public.rail_interactions TO service_role;
ALTER TABLE public.rail_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone records interactions" ON public.rail_interactions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL AND auth.uid() IS NULL)
    OR (auth.uid() = user_id)
  );

CREATE POLICY "Admins view interactions" ON public.rail_interactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.rail_ctr_summary(_days INTEGER DEFAULT 7)
RETURNS TABLE (
  rail_key TEXT,
  product_id UUID,
  rule_id UUID,
  impressions BIGINT,
  clicks BIGINT,
  add_to_cart BIGINT,
  ctr NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rail_key,
    product_id,
    rule_id,
    COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
    COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
    COUNT(*) FILTER (WHERE event_type = 'add_to_cart') AS add_to_cart,
    CASE WHEN COUNT(*) FILTER (WHERE event_type = 'impression') > 0
         THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'click')::NUMERIC
              / COUNT(*) FILTER (WHERE event_type = 'impression'), 4)
         ELSE 0 END AS ctr
  FROM public.rail_interactions
  WHERE created_at >= now() - (_days || ' days')::interval
  GROUP BY rail_key, product_id, rule_id;
$$;

REVOKE EXECUTE ON FUNCTION public.rail_ctr_summary(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rail_ctr_summary(INTEGER) TO authenticated, service_role;
