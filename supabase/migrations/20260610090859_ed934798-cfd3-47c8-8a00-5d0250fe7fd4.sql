-- ============================================================
-- Phase G · Batch 1: Covering indexes for hot query paths
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer_created
  ON public.orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sub_orders_vendor_status
  ON public.sub_orders (vendor_id, status);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON public.analytics_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_waitlist_pending
  ON public.product_waitlist (product_id)
  WHERE notified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed
  ON public.recently_viewed_products (user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id, created_at DESC);

-- ============================================================
-- Phase G · Batch 1: Service-role grant sweep
-- Ensures every public table that edge functions/cron jobs touch
-- has ALL privileges granted to service_role. Idempotent.
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- Phase G · Batch 2: Webhook idempotency ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received',
  error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_provider_event_unique UNIQUE (provider, event_id)
);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages webhook events" ON public.webhook_events;
CREATE POLICY "Service role manages webhook events"
  ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_status
  ON public.webhook_events (provider, status, created_at DESC);

-- Atomic claim helper: returns true on first claim, false if duplicate.
-- Use from edge functions to short-circuit duplicate webhook deliveries.
CREATE OR REPLACE FUNCTION public.claim_webhook_event(
  _provider text,
  _event_id text,
  _event_type text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted boolean;
BEGIN
  INSERT INTO public.webhook_events (provider, event_id, event_type, payload)
  VALUES (_provider, _event_id, _event_type, COALESCE(_payload, '{}'::jsonb))
  ON CONFLICT (provider, event_id) DO NOTHING
  RETURNING true INTO _inserted;

  RETURN COALESCE(_inserted, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webhook_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_webhook_processed(
  _provider text,
  _event_id text,
  _status text DEFAULT 'processed',
  _error text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.webhook_events
     SET status = _status,
         error = _error,
         processed_at = now()
   WHERE provider = _provider AND event_id = _event_id;
$$;

REVOKE ALL ON FUNCTION public.mark_webhook_processed(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_webhook_processed(text, text, text, text) TO service_role;