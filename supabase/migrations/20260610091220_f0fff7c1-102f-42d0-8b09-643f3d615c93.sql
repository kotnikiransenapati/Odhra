-- ============================================================
-- Phase G · Batch 4: RLS audit RPCs (admin-only metadata views)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_rls_audit()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  policy_count integer,
  has_service_role_grant boolean,
  has_authenticated_grant boolean,
  has_anon_grant boolean,
  approx_row_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    c.relname::text AS table_name,
    c.relrowsecurity AS rls_enabled,
    COALESCE(p.policy_count, 0)::integer AS policy_count,
    COALESCE(has_table_privilege('service_role', c.oid, 'SELECT'), false) AS has_service_role_grant,
    COALESCE(has_table_privilege('authenticated', c.oid, 'SELECT'), false) AS has_authenticated_grant,
    COALESCE(has_table_privilege('anon', c.oid, 'SELECT'), false) AS has_anon_grant,
    c.reltuples::bigint AS approx_row_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN (
    SELECT schemaname, tablename, COUNT(*) AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
  ) p ON p.schemaname = n.nspname AND p.tablename = c.relname
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_rls_audit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rls_audit() TO authenticated;

-- ------------------------------------------------------------
-- Webhook-event stats for the same admin dashboard
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_webhook_stats(_days integer DEFAULT 7)
RETURNS TABLE (
  provider text,
  total bigint,
  processed bigint,
  failed bigint,
  duplicates bigint,
  last_event_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    we.provider,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE we.status = 'processed')::bigint AS processed,
    COUNT(*) FILTER (WHERE we.status = 'failed')::bigint AS failed,
    COUNT(*) FILTER (WHERE we.status = 'skipped')::bigint AS duplicates,
    MAX(we.created_at) AS last_event_at
  FROM public.webhook_events we
  WHERE we.created_at >= now() - make_interval(days => GREATEST(_days, 1))
  GROUP BY we.provider
  ORDER BY total DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_webhook_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_webhook_stats(integer) TO authenticated;