
-- Phase G Batch 5: Centralized Rate Limit Ledger
-- Sliding window rate limiter via security definer RPCs

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (identifier, endpoint, window_start DESC);

GRANT ALL ON public.rate_limits TO service_role;

-- Atomic claim: returns (allowed boolean, remaining int, reset_at timestamptz)
CREATE OR REPLACE FUNCTION public.claim_rate_limit(
  _identifier text,
  _identifier_type text,
  _endpoint text,
  _max_requests int,
  _window_seconds int
)
RETURNS TABLE(allowed boolean, remaining int, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz := date_trunc('second', now()) - make_interval(secs => (extract(epoch from now())::bigint % _window_seconds));
  v_count int;
  v_reset timestamptz := v_window_start + make_interval(secs => _window_seconds);
BEGIN
  INSERT INTO public.rate_limits (identifier, identifier_type, endpoint, request_count, window_start)
  VALUES (_identifier, _identifier_type, _endpoint, 1, v_window_start)
  ON CONFLICT DO NOTHING;

  UPDATE public.rate_limits
     SET request_count = request_count + 1
   WHERE identifier = _identifier
     AND endpoint = _endpoint
     AND window_start = v_window_start
  RETURNING request_count INTO v_count;

  IF v_count IS NULL THEN
    INSERT INTO public.rate_limits (identifier, identifier_type, endpoint, request_count, window_start)
    VALUES (_identifier, _identifier_type, _endpoint, 1, v_window_start)
    RETURNING request_count INTO v_count;
  END IF;

  -- Garbage collect old windows opportunistically (1% chance)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN QUERY SELECT
    (v_count <= _max_requests),
    GREATEST(_max_requests - v_count, 0),
    v_reset;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_rate_limit(text, text, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rate_limit(text, text, text, int, int) TO service_role;

-- Unique index for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS uniq_rate_limits_window
  ON public.rate_limits (identifier, endpoint, window_start);

-- Phase G Batch 6: Enable pg_cron + pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
