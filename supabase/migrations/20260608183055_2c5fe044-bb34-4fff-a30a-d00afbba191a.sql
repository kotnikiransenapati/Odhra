CREATE OR REPLACE FUNCTION public.admin_bulk_update_orders(
  p_order_ids uuid[],
  p_status public.order_status,
  p_admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_updated_count integer := 0;
  v_sub_order_count integer := 0;
  v_note_count integer := 0;
  v_clean_note text := NULLIF(btrim(COALESCE(p_admin_note, '')), '');
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_order_ids IS NULL OR cardinality(p_order_ids) = 0 THEN
    RETURN jsonb_build_object('updated_orders', 0, 'updated_sub_orders', 0, 'notes_created', 0);
  END IF;

  UPDATE public.orders
  SET
    status = p_status,
    admin_note = COALESCE(v_clean_note, admin_note),
    updated_at = now()
  WHERE id = ANY(p_order_ids);
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  UPDATE public.sub_orders
  SET
    status = p_status,
    updated_at = now()
  WHERE order_id = ANY(p_order_ids);
  GET DIAGNOSTICS v_sub_order_count = ROW_COUNT;

  INSERT INTO public.order_activity_log (
    order_id,
    actor_id,
    actor_type,
    activity_type,
    title,
    description,
    metadata
  )
  SELECT
    o.id,
    v_actor,
    'admin',
    'status_change',
    'Bulk status update',
    COALESCE(v_clean_note, 'Order status changed to ' || p_status::text || ' via bulk action'),
    jsonb_build_object('status', p_status::text, 'bulk', true)
  FROM public.orders o
  WHERE o.id = ANY(p_order_ids);

  IF v_clean_note IS NOT NULL THEN
    INSERT INTO public.order_notes (order_id, note, note_type, created_by)
    SELECT o.id, v_clean_note, 'bulk_action', v_actor
    FROM public.orders o
    WHERE o.id = ANY(p_order_ids);
    GET DIAGNOSTICS v_note_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'updated_orders', v_updated_count,
    'updated_sub_orders', v_sub_order_count,
    'notes_created', v_note_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_bulk_update_orders(uuid[], public.order_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bulk_update_orders(uuid[], public.order_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_update_orders(uuid[], public.order_status, text) TO service_role;