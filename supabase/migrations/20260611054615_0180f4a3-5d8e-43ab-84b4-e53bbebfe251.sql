CREATE OR REPLACE FUNCTION public.admin_security_event_stats(_hours INT DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _window INT := GREATEST(1, LEAST(COALESCE(_hours, 24), 720));
BEGIN
  IF NOT (public.admin_has_permission(auth.uid(), 'view_error_monitoring') OR public.admin_has_permission(auth.uid(), 'manage_admins')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH scoped AS (
    SELECT *
    FROM public.security_event_ledger
    WHERE occurred_at >= now() - make_interval(hours => _window)
  ), source_counts AS (
    SELECT source, COUNT(*) AS source_count
    FROM scoped
    GROUP BY source
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM scoped),
    'critical', (SELECT COUNT(*) FROM scoped WHERE severity = 'critical'),
    'high', (SELECT COUNT(*) FROM scoped WHERE severity = 'high'),
    'medium', (SELECT COUNT(*) FROM scoped WHERE severity = 'medium'),
    'low', (SELECT COUNT(*) FROM scoped WHERE severity = 'low'),
    'info', (SELECT COUNT(*) FROM scoped WHERE severity = 'info'),
    'sources', COALESCE((SELECT jsonb_object_agg(source, source_count) FROM source_counts), '{}'::jsonb),
    'last_event_at', (SELECT MAX(occurred_at) FROM scoped)
  ) INTO _result;

  RETURN _result;
END;
$$;