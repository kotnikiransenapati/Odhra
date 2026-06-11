
-- =============================================================
-- BATCH 35: Data Retention Policies
-- =============================================================
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL CHECK (retention_days >= 1),
  date_column TEXT NOT NULL DEFAULT 'created_at',
  delete_mode TEXT NOT NULL DEFAULT 'hard' CHECK (delete_mode IN ('hard','soft')),
  soft_delete_column TEXT,
  filter_expression TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  last_run_at TIMESTAMPTZ,
  last_purged_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_retention_policies TO authenticated;
GRANT ALL ON public.data_retention_policies TO service_role;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage retention policies"
  ON public.data_retention_policies FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_admins'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_admins'));

CREATE POLICY "Service role full access retention"
  ON public.data_retention_policies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_retention_active ON public.data_retention_policies(is_active, last_run_at);

CREATE OR REPLACE FUNCTION public.tg_retention_touch() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_retention_touch ON public.data_retention_policies;
CREATE TRIGGER trg_retention_touch BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.tg_retention_touch();

-- Allowed tables for retention purges (security allow-list)
CREATE OR REPLACE FUNCTION public.retention_allowed_table(_table TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT _table = ANY (ARRAY[
    'analytics_events','error_logs','webhook_events','audit_logs',
    'user_behavior_events','cart_abandonment_events','campaign_link_events',
    'email_campaign_logs','admin_audit_log','admin_session_activity',
    'edge_function_metrics','system_heartbeats','dead_letter_queue',
    'mutation_idempotency','rate_limits','otp_verifications',
    'shipment_events','order_activity_log','price_history',
    'banner_ab_analytics','fraud_signals','spin_wheel_entries'
  ]);
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_retention_policy(
  _id UUID, _table_name TEXT, _retention_days INTEGER, _date_column TEXT,
  _delete_mode TEXT, _soft_delete_column TEXT, _filter_expression TEXT,
  _is_active BOOLEAN, _description TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF NOT public.retention_allowed_table(_table_name) THEN
    RAISE EXCEPTION 'Table % is not allow-listed for retention', _table_name;
  END IF;
  IF _delete_mode = 'soft' AND COALESCE(_soft_delete_column,'') = '' THEN
    RAISE EXCEPTION 'soft delete requires soft_delete_column';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.data_retention_policies(
      table_name, retention_days, date_column, delete_mode,
      soft_delete_column, filter_expression, is_active, description, created_by
    ) VALUES (
      _table_name, _retention_days, COALESCE(_date_column,'created_at'),
      _delete_mode, _soft_delete_column, _filter_expression,
      COALESCE(_is_active, true), _description, auth.uid()
    )
    ON CONFLICT (table_name) DO UPDATE SET
      retention_days = EXCLUDED.retention_days,
      date_column = EXCLUDED.date_column,
      delete_mode = EXCLUDED.delete_mode,
      soft_delete_column = EXCLUDED.soft_delete_column,
      filter_expression = EXCLUDED.filter_expression,
      is_active = EXCLUDED.is_active,
      description = EXCLUDED.description
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.data_retention_policies SET
      table_name = _table_name,
      retention_days = _retention_days,
      date_column = COALESCE(_date_column,'created_at'),
      delete_mode = _delete_mode,
      soft_delete_column = _soft_delete_column,
      filter_expression = _filter_expression,
      is_active = COALESCE(_is_active, is_active),
      description = _description
    WHERE id = _id RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'retention.upsert', 'data_retention_policy', v_id,
          jsonb_build_object('table', _table_name, 'days', _retention_days));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_retention_policy(_id UUID, _is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  UPDATE public.data_retention_policies SET is_active = _is_active WHERE id = _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'retention.toggle', 'data_retention_policy', _id, jsonb_build_object('active', _is_active));
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_retention_policy(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  DELETE FROM public.data_retention_policies WHERE id = _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'retention.delete', 'data_retention_policy', _id);
END $$;

-- Execute a single policy (used by manual run + nightly job)
CREATE OR REPLACE FUNCTION public.admin_run_retention_policy(_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.data_retention_policies%ROWTYPE;
  v_sql TEXT;
  v_cutoff TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  SELECT * INTO p FROM public.data_retention_policies WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF NOT public.retention_allowed_table(p.table_name) THEN
    RAISE EXCEPTION 'Table not allow-listed'; END IF;

  v_cutoff := now() - (p.retention_days || ' days')::interval;

  IF p.delete_mode = 'soft' THEN
    v_sql := format(
      'UPDATE public.%I SET %I = now() WHERE %I < $1 AND %I IS NULL %s',
      p.table_name, p.soft_delete_column, p.date_column, p.soft_delete_column,
      CASE WHEN COALESCE(p.filter_expression,'') = '' THEN '' ELSE 'AND (' || p.filter_expression || ')' END
    );
  ELSE
    v_sql := format(
      'DELETE FROM public.%I WHERE %I < $1 %s',
      p.table_name, p.date_column,
      CASE WHEN COALESCE(p.filter_expression,'') = '' THEN '' ELSE 'AND (' || p.filter_expression || ')' END
    );
  END IF;

  BEGIN
    EXECUTE v_sql USING v_cutoff;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE public.data_retention_policies
       SET last_run_at = now(), last_purged_count = v_count, last_error = NULL
     WHERE id = _id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.data_retention_policies
       SET last_run_at = now(), last_error = SQLERRM
     WHERE id = _id;
    RAISE;
  END;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'retention.run', 'data_retention_policy', _id,
          jsonb_build_object('purged', v_count, 'cutoff', v_cutoff));
  RETURN v_count;
END $$;

-- Process all active due policies (nightly maintenance) — service role only
CREATE OR REPLACE FUNCTION public.admin_process_due_retention_policies()
RETURNS TABLE(policy_id UUID, table_name TEXT, purged INTEGER, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_count INTEGER; v_cutoff TIMESTAMPTZ; v_sql TEXT;
BEGIN
  IF auth.role() <> 'service_role'
     AND NOT public.admin_has_permission(auth.uid(), 'manage_admins') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;

  FOR r IN
    SELECT * FROM public.data_retention_policies
     WHERE is_active = true
       AND (last_run_at IS NULL OR last_run_at < now() - interval '20 hours')
  LOOP
    v_cutoff := now() - (r.retention_days || ' days')::interval;
    IF NOT public.retention_allowed_table(r.table_name) THEN CONTINUE; END IF;
    BEGIN
      IF r.delete_mode = 'soft' THEN
        v_sql := format('UPDATE public.%I SET %I = now() WHERE %I < $1 AND %I IS NULL',
                        r.table_name, r.soft_delete_column, r.date_column, r.soft_delete_column);
      ELSE
        v_sql := format('DELETE FROM public.%I WHERE %I < $1', r.table_name, r.date_column);
      END IF;
      EXECUTE v_sql USING v_cutoff;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      UPDATE public.data_retention_policies
         SET last_run_at = now(), last_purged_count = v_count, last_error = NULL
       WHERE id = r.id;
      policy_id := r.id; table_name := r.table_name; purged := v_count; error := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.data_retention_policies
         SET last_run_at = now(), last_error = SQLERRM WHERE id = r.id;
      policy_id := r.id; table_name := r.table_name; purged := 0; error := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END $$;

-- =============================================================
-- BATCH 36: Email Deliverability Monitor
-- =============================================================
CREATE TABLE IF NOT EXISTS public.email_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_hash TEXT NOT NULL,
  recipient_domain TEXT,
  template TEXT,
  subject TEXT,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued','sent','delivered','bounced','complained','opened','clicked','failed')),
  bounce_type TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.email_delivery_events TO authenticated;
GRANT ALL ON public.email_delivery_events TO service_role;
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read email events"
  ON public.email_delivery_events FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_error_monitoring'));

CREATE POLICY "Service inserts email events"
  ON public.email_delivery_events FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service all email events"
  ON public.email_delivery_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_email_events_status_time ON public.email_delivery_events(status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_template ON public.email_delivery_events(template, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_domain ON public.email_delivery_events(recipient_domain, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_provider_msg ON public.email_delivery_events(provider_message_id);

-- Aggregate stats RPC
CREATE OR REPLACE FUNCTION public.admin_email_deliverability_stats(_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB; v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  v_since := now() - (GREATEST(_hours,1) || ' hours')::interval;

  SELECT jsonb_build_object(
    'since', v_since,
    'total', COUNT(*),
    'sent', COUNT(*) FILTER (WHERE status IN ('sent','delivered','opened','clicked')),
    'delivered', COUNT(*) FILTER (WHERE status IN ('delivered','opened','clicked')),
    'bounced', COUNT(*) FILTER (WHERE status = 'bounced'),
    'complained', COUNT(*) FILTER (WHERE status = 'complained'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'opened', COUNT(*) FILTER (WHERE status = 'opened'),
    'clicked', COUNT(*) FILTER (WHERE status = 'clicked'),
    'by_template', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('template', template, 'count', c) ORDER BY c DESC)
      FROM (SELECT COALESCE(template,'(none)') AS template, COUNT(*) AS c
              FROM public.email_delivery_events
             WHERE occurred_at >= v_since GROUP BY 1 ORDER BY 2 DESC LIMIT 10) t
    ), '[]'::jsonb),
    'by_domain', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('domain', domain, 'count', c,
                                          'bounce_rate', round(bounces::numeric / NULLIF(c,0) * 100, 2)) ORDER BY c DESC)
      FROM (SELECT COALESCE(recipient_domain,'(unknown)') AS domain,
                   COUNT(*) AS c,
                   COUNT(*) FILTER (WHERE status='bounced') AS bounces
              FROM public.email_delivery_events
             WHERE occurred_at >= v_since GROUP BY 1 ORDER BY 2 DESC LIMIT 10) d
    ), '[]'::jsonb)
  ) INTO v
    FROM public.email_delivery_events
   WHERE occurred_at >= v_since;
  RETURN v;
END $$;

-- Recent events list (with limit + filter)
CREATE OR REPLACE FUNCTION public.admin_email_recent_events(
  _status TEXT DEFAULT NULL, _template TEXT DEFAULT NULL, _limit INTEGER DEFAULT 100
) RETURNS SETOF public.email_delivery_events
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_error_monitoring') THEN
    RAISE EXCEPTION 'Permission denied'; END IF;
  RETURN QUERY
    SELECT * FROM public.email_delivery_events
     WHERE (_status IS NULL OR status = _status)
       AND (_template IS NULL OR template = _template)
     ORDER BY occurred_at DESC
     LIMIT LEAST(GREATEST(_limit,1), 500);
END $$;
