CREATE OR REPLACE FUNCTION public.admin_ticket_copilot_context(_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket JSONB;
  v_messages JSONB;
  v_customer JSONB;
  v_orders JSONB;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(), 'view_tickets') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT to_jsonb(st) INTO v_ticket
  FROM public.support_tickets st
  WHERE st.id = _ticket_id;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'ticket_not_found';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'message', left(m.message, 2000),
    'is_staff_reply', m.is_staff_reply,
    'created_at', m.created_at
  ) ORDER BY m.created_at ASC), '[]'::jsonb)
  INTO v_messages
  FROM public.support_ticket_messages m
  WHERE m.ticket_id = _ticket_id;

  SELECT jsonb_build_object(
    'full_name', p.full_name,
    'created_at', p.created_at,
    'has_phone', p.phone IS NOT NULL,
    'has_delivery_instructions', COALESCE(length(p.delivery_instructions), 0) > 0
  ) INTO v_customer
  FROM public.profiles p
  WHERE p.id = (v_ticket->>'user_id')::uuid;

  SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'created_at')::timestamptz DESC), '[]'::jsonb)
  INTO v_orders
  FROM (
    SELECT jsonb_build_object(
      'order_number', o.order_number,
      'status', o.status::text,
      'payment_status', o.payment_status::text,
      'total_amount', o.total_amount,
      'created_at', o.created_at
    ) AS item
    FROM public.orders o
    WHERE o.customer_id = (v_ticket->>'user_id')::uuid
    ORDER BY o.created_at DESC
    LIMIT 5
  ) recent;

  RETURN jsonb_build_object(
    'ticket', v_ticket - 'attachments',
    'messages', v_messages,
    'customer', COALESCE(v_customer, '{}'::jsonb),
    'recent_orders', COALESCE(v_orders, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ticket_copilot_context(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ticket_copilot_context(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ticket_copilot_context(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.list_ticket_ai_suggestions(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_ticket_ai_suggestions(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_ticket_ai_suggestions(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.compute_customer_risk_score(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_customer_risk_score(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.compute_customer_risk_score(UUID) TO authenticated;