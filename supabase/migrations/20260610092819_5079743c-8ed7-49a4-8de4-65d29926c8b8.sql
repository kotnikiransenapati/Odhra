
CREATE OR REPLACE FUNCTION public.admin_storage_usage()
RETURNS TABLE(
  bucket_id text,
  is_public boolean,
  object_count bigint,
  total_bytes bigint,
  avg_bytes bigint,
  largest_bytes bigint,
  last_uploaded_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF NOT public._caller_is_active_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    b.id::text,
    b.public,
    COALESCE(s.cnt, 0),
    COALESCE(s.total, 0),
    COALESCE(s.avg_b, 0),
    COALESCE(s.maxb, 0),
    s.last_upload
  FROM storage.buckets b
  LEFT JOIN LATERAL (
    SELECT
      count(*)::bigint AS cnt,
      sum((o.metadata->>'size')::bigint)::bigint AS total,
      avg((o.metadata->>'size')::bigint)::bigint AS avg_b,
      max((o.metadata->>'size')::bigint)::bigint AS maxb,
      max(o.created_at) AS last_upload
    FROM storage.objects o
    WHERE o.bucket_id = b.id
  ) s ON true
  ORDER BY COALESCE(s.total, 0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_storage_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_storage_usage() TO authenticated, service_role;
