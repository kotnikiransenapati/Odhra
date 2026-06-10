-- ============================================================================
-- Phase G Batch 17: Admin Webhook Explorer
-- Phase G Batch 18: Outbound API Circuit Breaker
-- ============================================================================

-- Keep the DLQ compatible with admin replay tooling introduced in Phase G.
ALTER TABLE public.dead_letter_queue
  DROP CONSTRAINT IF EXISTS dead_letter_queue_status_check;

ALTER TABLE public.dead_letter_queue
  ADD CONSTRAINT dead_letter_queue_status_check
  CHECK (status IN ('failed','retrying','resolved','abandoned','pending','discarded'));

CREATE OR REPLACE FUNCTION public.admin_webhook_events(
  _provider text DEFAULT NULL,
  _status text DEFAULT NULL,
  _search text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  provider text,
  event_id text,
  event_type text,
  status text,
  error text,
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT w.*
    FROM public.webhook_events w
    WHERE (_provider IS NULL OR w.provider = _provider)
      AND (_status IS NULL OR w.status = _status)
      AND (
        _search IS NULL
        OR w.event_id ILIKE '%' || _search || '%'
        OR COALESCE(w.event_type, '') ILIKE '%' || _search || '%'
        OR COALESCE(w.error, '') ILIKE '%' || _search || '%'
        OR w.payload::text ILIKE '%' || _search || '%'
      )
  ), counted AS (
    SELECT count(*)::bigint AS c FROM filtered
  )
  SELECT f.id, f.provider, f.event_id, f.event_type, f.status, f.error,
         f.payload, f.processed_at, f.created_at, (SELECT c FROM counted)
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100)
  OFFSET GREATEST(_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_webhook_events(text, text, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_webhook_events(text, text, text, int, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_webhook_requeue(_id uuid, _reason text DEFAULT NULL)
RETURNS public.dead_letter_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.webhook_events;
  q public.dead_letter_queue;
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO w FROM public.webhook_events WHERE id = _id;
  IF w.id IS NULL THEN
    RAISE EXCEPTION 'webhook event % not found', _id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.dead_letter_queue (
    job_type, payload, error_message, attempts, next_retry_at, status, source
  ) VALUES (
    'webhook_replay',
    jsonb_build_object(
      'webhook_event_id', w.id,
      'provider', w.provider,
      'event_id', w.event_id,
      'event_type', w.event_type,
      'payload', w.payload,
      'reason', NULLIF(trim(COALESCE(_reason, '')), '')
    ),
    'Manual webhook replay requested by admin',
    0,
    now(),
    'pending',
    'admin_webhook_explorer'
  ) RETURNING * INTO q;

  UPDATE public.webhook_events
     SET status = 'retry_queued',
         error = NULLIF(trim(COALESCE(_reason, '')), ''),
         processed_at = now()
   WHERE id = w.id;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_values)
  VALUES (
    auth.uid(),
    'webhook.requeue',
    'webhook_events',
    w.id::text,
    jsonb_build_object('provider', w.provider, 'event_id', w.event_id, 'queue_id', q.id, 'reason', _reason)
  );

  RETURN q;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_webhook_requeue(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_webhook_requeue(uuid, text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_desc
  ON public.webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status_created
  ON public.webhook_events (status, created_at DESC);

-- ----------------------------------------------------------------------------
-- Outbound API circuit breakers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outbound_circuit_breakers (
  service_key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  state text NOT NULL DEFAULT 'closed' CHECK (state IN ('closed','open','half_open')),
  failure_count int NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  success_count int NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failure_threshold int NOT NULL DEFAULT 5 CHECK (failure_threshold BETWEEN 1 AND 100),
  cooldown_seconds int NOT NULL DEFAULT 300 CHECK (cooldown_seconds BETWEEN 30 AND 86400),
  opened_until timestamptz,
  last_failure_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.outbound_circuit_breakers TO authenticated;
GRANT ALL ON public.outbound_circuit_breakers TO service_role;

ALTER TABLE public.outbound_circuit_breakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view outbound circuit breakers" ON public.outbound_circuit_breakers;
CREATE POLICY "Admins can view outbound circuit breakers"
  ON public.outbound_circuit_breakers
  FOR SELECT
  TO authenticated
  USING (public._caller_is_active_admin());

DROP POLICY IF EXISTS "Admins can manage outbound circuit breakers" ON public.outbound_circuit_breakers;
CREATE POLICY "Admins can manage outbound circuit breakers"
  ON public.outbound_circuit_breakers
  FOR UPDATE
  TO authenticated
  USING (public._caller_is_active_admin())
  WITH CHECK (public._caller_is_active_admin());

DROP POLICY IF EXISTS "Service role manages outbound circuit breakers" ON public.outbound_circuit_breakers;
CREATE POLICY "Service role manages outbound circuit breakers"
  ON public.outbound_circuit_breakers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_outbound_circuit_breakers_updated_at ON public.outbound_circuit_breakers;
CREATE TRIGGER trg_outbound_circuit_breakers_updated_at
  BEFORE UPDATE ON public.outbound_circuit_breakers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.outbound_circuit_breakers (service_key, label, category, failure_threshold, cooldown_seconds)
VALUES
  ('razorpay', 'Razorpay Payments', 'payments', 3, 300),
  ('delhivery', 'Delhivery Logistics', 'logistics', 5, 600),
  ('indiapost', 'India Post Logistics', 'logistics', 5, 900),
  ('whatsapp_cloud', 'WhatsApp Cloud API', 'messaging', 5, 600),
  ('email_delivery', 'Email Delivery', 'messaging', 8, 900),
  ('ai_gateway', 'AI Gateway', 'ai', 6, 300)
ON CONFLICT (service_key) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  failure_threshold = EXCLUDED.failure_threshold,
  cooldown_seconds = EXCLUDED.cooldown_seconds,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.circuit_breaker_before_request(_service_key text)
RETURNS TABLE(
  allowed boolean,
  state text,
  retry_after_seconds int,
  failure_count int,
  opened_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.outbound_circuit_breakers;
BEGIN
  SELECT * INTO r
  FROM public.outbound_circuit_breakers
  WHERE service_key = _service_key
  FOR UPDATE;

  IF r.service_key IS NULL THEN
    INSERT INTO public.outbound_circuit_breakers (service_key, label)
    VALUES (_service_key, initcap(replace(_service_key, '_', ' ')))
    RETURNING * INTO r;
  END IF;

  IF r.state = 'open' AND r.opened_until IS NOT NULL AND r.opened_until > now() THEN
    RETURN QUERY SELECT false, r.state, GREATEST(ceil(extract(epoch FROM (r.opened_until - now())))::int, 1), r.failure_count, r.opened_until;
    RETURN;
  END IF;

  IF r.state = 'open' AND (r.opened_until IS NULL OR r.opened_until <= now()) THEN
    UPDATE public.outbound_circuit_breakers
       SET state = 'half_open', updated_at = now()
     WHERE service_key = _service_key
     RETURNING * INTO r;
  END IF;

  RETURN QUERY SELECT true, r.state, 0, r.failure_count, r.opened_until;
END;
$$;

REVOKE ALL ON FUNCTION public.circuit_breaker_before_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circuit_breaker_before_request(text) TO service_role;

CREATE OR REPLACE FUNCTION public.circuit_breaker_record_success(_service_key text)
RETURNS public.outbound_circuit_breakers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.outbound_circuit_breakers;
BEGIN
  INSERT INTO public.outbound_circuit_breakers (service_key, label, state, success_count, last_success_at)
  VALUES (_service_key, initcap(replace(_service_key, '_', ' ')), 'closed', 1, now())
  ON CONFLICT (service_key) DO UPDATE SET
    state = 'closed',
    failure_count = 0,
    success_count = public.outbound_circuit_breakers.success_count + 1,
    opened_until = NULL,
    last_success_at = now(),
    last_error = NULL,
    updated_at = now()
  RETURNING * INTO r;
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.circuit_breaker_record_success(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circuit_breaker_record_success(text) TO service_role;

CREATE OR REPLACE FUNCTION public.circuit_breaker_record_failure(_service_key text, _error text DEFAULT NULL)
RETURNS public.outbound_circuit_breakers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.outbound_circuit_breakers;
BEGIN
  INSERT INTO public.outbound_circuit_breakers (service_key, label, state, failure_count, last_failure_at, last_error)
  VALUES (_service_key, initcap(replace(_service_key, '_', ' ')), 'closed', 1, now(), left(_error, 500))
  ON CONFLICT (service_key) DO UPDATE SET
    failure_count = public.outbound_circuit_breakers.failure_count + 1,
    last_failure_at = now(),
    last_error = left(_error, 500),
    state = CASE
      WHEN public.outbound_circuit_breakers.state = 'half_open'
        OR public.outbound_circuit_breakers.failure_count + 1 >= public.outbound_circuit_breakers.failure_threshold
      THEN 'open'
      ELSE public.outbound_circuit_breakers.state
    END,
    opened_until = CASE
      WHEN public.outbound_circuit_breakers.state = 'half_open'
        OR public.outbound_circuit_breakers.failure_count + 1 >= public.outbound_circuit_breakers.failure_threshold
      THEN now() + make_interval(secs => public.outbound_circuit_breakers.cooldown_seconds)
      ELSE public.outbound_circuit_breakers.opened_until
    END,
    updated_at = now()
  RETURNING * INTO r;
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.circuit_breaker_record_failure(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.circuit_breaker_record_failure(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_circuit_breakers()
RETURNS SETOF public.outbound_circuit_breakers
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT * FROM public.outbound_circuit_breakers
  ORDER BY category, service_key;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_circuit_breakers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_circuit_breakers() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_circuit_breaker(
  _service_key text,
  _state text,
  _reason text DEFAULT NULL
)
RETURNS public.outbound_circuit_breakers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.outbound_circuit_breakers;
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _state NOT IN ('closed','open','half_open') THEN
    RAISE EXCEPTION 'invalid circuit state: %', _state USING ERRCODE = '22023';
  END IF;

  UPDATE public.outbound_circuit_breakers
     SET state = _state,
         failure_count = CASE WHEN _state = 'closed' THEN 0 ELSE failure_count END,
         opened_until = CASE WHEN _state = 'open' THEN now() + make_interval(secs => cooldown_seconds) ELSE NULL END,
         last_error = NULLIF(trim(COALESCE(_reason, '')), ''),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE service_key = _service_key
   RETURNING * INTO r;

  IF r.service_key IS NULL THEN
    RAISE EXCEPTION 'circuit breaker % not found', _service_key USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_values)
  VALUES (
    auth.uid(),
    'circuit_breaker.set_state',
    'outbound_circuit_breakers',
    _service_key,
    jsonb_build_object('state', _state, 'reason', _reason)
  );

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_circuit_breaker(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_circuit_breaker(text, text, text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_outbound_circuit_breakers_state
  ON public.outbound_circuit_breakers (state, updated_at DESC);