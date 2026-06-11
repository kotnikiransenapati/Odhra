
-- =========================================================
-- BATCH 67: Vendor Payout Holds
-- =========================================================
CREATE TABLE public.vendor_payout_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  placed_by uuid NOT NULL,
  released_by uuid,
  released_at timestamptz,
  release_note text CHECK (release_note IS NULL OR char_length(release_note) <= 1000),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vph_vendor_active ON public.vendor_payout_holds(vendor_id) WHERE is_active;
CREATE INDEX idx_vph_severity ON public.vendor_payout_holds(severity) WHERE is_active;
CREATE INDEX idx_vph_created ON public.vendor_payout_holds(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_payout_holds TO authenticated;
GRANT ALL ON public.vendor_payout_holds TO service_role;
ALTER TABLE public.vendor_payout_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vph_admin_select" ON public.vendor_payout_holds FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'view_payouts'));
CREATE POLICY "vph_admin_manage" ON public.vendor_payout_holds FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(), 'manage_payouts'))
  WITH CHECK (public.admin_has_permission(auth.uid(), 'manage_payouts'));

CREATE TRIGGER trg_vph_updated BEFORE UPDATE ON public.vendor_payout_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPCs
CREATE OR REPLACE FUNCTION public.admin_payout_holds_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_payouts') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'active_total', COUNT(*) FILTER (WHERE is_active),
    'critical', COUNT(*) FILTER (WHERE is_active AND severity='critical'),
    'high', COUNT(*) FILTER (WHERE is_active AND severity='high'),
    'vendors_held', COUNT(DISTINCT vendor_id) FILTER (WHERE is_active),
    'released_7d', COUNT(*) FILTER (WHERE released_at IS NOT NULL AND released_at > now() - interval '7 days')
  ) INTO r FROM public.vendor_payout_holds;
  RETURN COALESCE(r,'{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_payout_holds_list(_status text DEFAULT 'active', _limit int DEFAULT 200)
RETURNS TABLE (
  id uuid, vendor_id uuid, vendor_business_name text, reason text, severity text,
  is_active boolean, placed_by uuid, released_by uuid, released_at timestamptz,
  release_note text, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_payouts') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT h.id, h.vendor_id, v.business_name, h.reason, h.severity, h.is_active,
         h.placed_by, h.released_by, h.released_at, h.release_note, h.created_at
  FROM public.vendor_payout_holds h
  LEFT JOIN public.vendors v ON v.id = h.vendor_id
  WHERE (_status = 'all')
     OR (_status = 'active' AND h.is_active)
     OR (_status = 'released' AND NOT h.is_active)
  ORDER BY h.is_active DESC, h.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
END $$;

CREATE OR REPLACE FUNCTION public.admin_payout_hold_place(_vendor_id uuid, _reason text, _severity text DEFAULT 'medium')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_payouts') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _severity NOT IN ('low','medium','high','critical') THEN
    RAISE EXCEPTION 'invalid severity';
  END IF;
  INSERT INTO public.vendor_payout_holds(vendor_id, reason, severity, placed_by)
  VALUES (_vendor_id, _reason, _severity, auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_payout_hold_release(_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_payouts') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.vendor_payout_holds
     SET is_active = false, released_by = auth.uid(), released_at = now(), release_note = _note
   WHERE id = _id AND is_active;
END $$;

CREATE OR REPLACE FUNCTION public.vendor_is_payout_blocked(_vendor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.vendor_payout_holds WHERE vendor_id = _vendor_id AND is_active);
$$;

-- =========================================================
-- BATCH 68: Customer Communication Log (unified)
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_customer_communications(_user_id uuid, _channel text DEFAULT 'all', _limit int DEFAULT 200)
RETURNS TABLE (
  channel text, occurred_at timestamptz, status text, subject text, recipient text, provider_id text, metadata jsonb
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_customers') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;

  RETURN QUERY
  SELECT * FROM (
    SELECT 'email'::text AS channel, e.created_at AS occurred_at, e.status::text,
           e.subject, e.recipient_email AS recipient, e.message_id AS provider_id,
           jsonb_build_object('event_type', e.event_type, 'bounce_type', e.bounce_type) AS metadata
    FROM public.email_delivery_events e
    WHERE _email IS NOT NULL AND e.recipient_email = _email
    UNION ALL
    SELECT 'sms'::text, s.created_at, s.status::text, NULL::text, s.recipient_phone, s.message_id,
           jsonb_build_object('event_type', s.event_type, 'error_code', s.error_code)
    FROM public.sms_delivery_events s
    WHERE s.user_id = _user_id
    UNION ALL
    SELECT 'push'::text, p.created_at, p.status::text, p.title, NULL::text, p.message_id,
           jsonb_build_object('event_type', p.event_type, 'platform', p.platform)
    FROM public.push_delivery_events p
    WHERE p.user_id = _user_id
    UNION ALL
    SELECT 'whatsapp'::text, w.created_at, w.status::text, w.template_name, w.recipient_phone, w.message_id,
           jsonb_build_object('direction', w.direction, 'template_name', w.template_name)
    FROM public.whatsapp_messages w
    WHERE w.user_id = _user_id
  ) merged
  WHERE _channel = 'all' OR merged.channel = _channel
  ORDER BY occurred_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
END $$;

CREATE OR REPLACE FUNCTION public.admin_customer_communications_stats(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; r jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'view_customers') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  SELECT jsonb_build_object(
    'email_count', (SELECT COUNT(*) FROM public.email_delivery_events WHERE _email IS NOT NULL AND recipient_email = _email),
    'sms_count', (SELECT COUNT(*) FROM public.sms_delivery_events WHERE user_id = _user_id),
    'push_count', (SELECT COUNT(*) FROM public.push_delivery_events WHERE user_id = _user_id),
    'whatsapp_count', (SELECT COUNT(*) FROM public.whatsapp_messages WHERE user_id = _user_id),
    'last_email_at', (SELECT MAX(created_at) FROM public.email_delivery_events WHERE _email IS NOT NULL AND recipient_email = _email),
    'last_whatsapp_at', (SELECT MAX(created_at) FROM public.whatsapp_messages WHERE user_id = _user_id)
  ) INTO r;
  RETURN COALESCE(r,'{}'::jsonb);
END $$;
