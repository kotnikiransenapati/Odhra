CREATE TABLE IF NOT EXISTS public.search_query_expansions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_normalized text NOT NULL UNIQUE,
  expanded_terms text[] NOT NULL DEFAULT '{}',
  intent_category text,
  intent_price_min numeric,
  intent_price_max numeric,
  hit_count int NOT NULL DEFAULT 1,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_search_query_expansions_query ON public.search_query_expansions(query_normalized);
CREATE INDEX IF NOT EXISTS idx_search_query_expansions_expires ON public.search_query_expansions(expires_at);

GRANT SELECT ON public.search_query_expansions TO anon, authenticated;
GRANT ALL ON public.search_query_expansions TO service_role;

ALTER TABLE public.search_query_expansions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read search expansions" ON public.search_query_expansions;
CREATE POLICY "Public read search expansions"
ON public.search_query_expansions FOR SELECT
USING (expires_at > now());

DROP POLICY IF EXISTS "Service role manages search expansions" ON public.search_query_expansions;
CREATE POLICY "Service role manages search expansions"
ON public.search_query_expansions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_search_query_expansions_updated
  BEFORE UPDATE ON public.search_query_expansions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();