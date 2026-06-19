
-- ============== BATCH H9: VENDOR TAX REPORTS ==============
CREATE TABLE IF NOT EXISTS public.vendor_tax_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  taxable_amount numeric(14,2) NOT NULL DEFAULT 0,
  cgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  sgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  igst_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_tax numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized','filed')),
  notes text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  finalized_by uuid,
  filed_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_tax_reports TO authenticated;
GRANT ALL ON public.vendor_tax_reports TO service_role;
ALTER TABLE public.vendor_tax_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vtr_select" ON public.vendor_tax_reports FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id=auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vtr_admin_write" ON public.vendor_tax_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_vtr_vendor_period ON public.vendor_tax_reports(vendor_id, period_month);

CREATE TRIGGER trg_vtr_updated_at BEFORE UPDATE ON public.vendor_tax_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_vendor_tax_report(_vendor_id uuid, _month date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _m date := COALESCE(date_trunc('month', _month)::date, date_trunc('month', now())::date);
  _start timestamptz := _m;
  _end timestamptz := (_m + interval '1 month');
  _taxable numeric(14,2); _cgst numeric(14,2); _sgst numeric(14,2);
  _igst numeric(14,2); _total numeric(14,2); _cnt int; _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    COALESCE(SUM(COALESCE(o.subtotal, o.total_amount - COALESCE(o.tax_amount,0))),0),
    COALESCE(SUM(COALESCE(o.cgst_amount,0)),0),
    COALESCE(SUM(COALESCE(o.sgst_amount,0)),0),
    COALESCE(SUM(COALESCE(o.igst_amount,0)),0),
    COALESCE(SUM(o.total_amount),0),
    COUNT(*)
  INTO _taxable, _cgst, _sgst, _igst, _total, _cnt
  FROM public.orders o
  WHERE o.vendor_id = _vendor_id
    AND o.created_at >= _start AND o.created_at < _end
    AND o.status NOT IN ('cancelled','refunded');

  INSERT INTO public.vendor_tax_reports(
    vendor_id, period_month, taxable_amount, cgst_amount, sgst_amount, igst_amount,
    total_tax, total_amount, order_count, status, computed_at
  ) VALUES (
    _vendor_id, _m, _taxable, _cgst, _sgst, _igst,
    _cgst + _sgst + _igst, _total, _cnt, 'draft', now()
  )
  ON CONFLICT (vendor_id, period_month) DO UPDATE
    SET taxable_amount=EXCLUDED.taxable_amount,
        cgst_amount=EXCLUDED.cgst_amount,
        sgst_amount=EXCLUDED.sgst_amount,
        igst_amount=EXCLUDED.igst_amount,
        total_tax=EXCLUDED.total_tax,
        total_amount=EXCLUDED.total_amount,
        order_count=EXCLUDED.order_count,
        computed_at=now(),
        status = CASE WHEN public.vendor_tax_reports.status='filed' THEN 'filed' ELSE 'draft' END
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_finalize_tax_report(_id uuid, _filed_reference text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.vendor_tax_reports
     SET status = CASE WHEN _filed_reference IS NOT NULL THEN 'filed' ELSE 'finalized' END,
         finalized_at = COALESCE(finalized_at, now()),
         finalized_by = COALESCE(finalized_by, auth.uid()),
         filed_reference = COALESCE(_filed_reference, filed_reference)
   WHERE id = _id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_tax_reports_list(_vendor_id uuid DEFAULT NULL, _limit int DEFAULT 100)
RETURNS SETOF public.vendor_tax_reports LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.vendor_tax_reports
    WHERE (_vendor_id IS NULL OR vendor_id=_vendor_id)
    ORDER BY period_month DESC, created_at DESC LIMIT _limit;
END;
$$;

-- ============== BATCH H10: NOTIFICATION DIGEST SCHEDULER ==============
CREATE TABLE IF NOT EXISTS public.notification_digest_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('off','daily','weekly','monthly')),
  channels text[] NOT NULL DEFAULT ARRAY['email']::text[],
  send_hour_local int NOT NULL DEFAULT 9 CHECK (send_hour_local BETWEEN 0 AND 23),
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  include_promotions boolean NOT NULL DEFAULT true,
  include_orders boolean NOT NULL DEFAULT true,
  include_recommendations boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  next_due_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_digest_schedules TO authenticated;
GRANT ALL ON public.notification_digest_schedules TO service_role;
ALTER TABLE public.notification_digest_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nds_self_select" ON public.notification_digest_schedules FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "nds_self_write" ON public.notification_digest_schedules FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.notification_digest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  schedule_id uuid REFERENCES public.notification_digest_schedules(id) ON DELETE SET NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped')),
  item_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.notification_digest_runs TO authenticated;
GRANT ALL ON public.notification_digest_runs TO service_role;
ALTER TABLE public.notification_digest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ndr_select" ON public.notification_digest_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ndr_admin_insert" ON public.notification_digest_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_nds_next_due ON public.notification_digest_schedules(next_due_at)
  WHERE is_active = true AND frequency <> 'off';
CREATE INDEX IF NOT EXISTS idx_ndr_user_sent ON public.notification_digest_runs(user_id, sent_at DESC);

CREATE TRIGGER trg_nds_updated_at BEFORE UPDATE ON public.notification_digest_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public._calc_digest_next_due(_freq text, _hour int)
RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE _base timestamptz := date_trunc('day', now()) + (_hour || ' hours')::interval;
BEGIN
  IF _base <= now() THEN _base := _base + interval '1 day'; END IF;
  RETURN CASE _freq
    WHEN 'daily'   THEN _base
    WHEN 'weekly'  THEN _base + interval '6 days'
    WHEN 'monthly' THEN _base + interval '29 days'
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.digest_upsert_preference(
  _frequency text, _channels text[], _send_hour_local int, _timezone text,
  _include_promotions boolean, _include_orders boolean, _include_recommendations boolean,
  _is_active boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid; _next timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _frequency NOT IN ('off','daily','weekly','monthly') THEN
    RAISE EXCEPTION 'invalid frequency';
  END IF;
  _next := public._calc_digest_next_due(_frequency, COALESCE(_send_hour_local, 9));
  INSERT INTO public.notification_digest_schedules(
    user_id, frequency, channels, send_hour_local, timezone,
    include_promotions, include_orders, include_recommendations, is_active, next_due_at
  ) VALUES(
    _uid, _frequency, COALESCE(_channels, ARRAY['email']::text[]),
    COALESCE(_send_hour_local, 9), COALESCE(_timezone, 'Asia/Kolkata'),
    COALESCE(_include_promotions, true), COALESCE(_include_orders, true),
    COALESCE(_include_recommendations, true), COALESCE(_is_active, true), _next
  )
  ON CONFLICT (user_id) DO UPDATE SET
    frequency = EXCLUDED.frequency,
    channels = EXCLUDED.channels,
    send_hour_local = EXCLUDED.send_hour_local,
    timezone = EXCLUDED.timezone,
    include_promotions = EXCLUDED.include_promotions,
    include_orders = EXCLUDED.include_orders,
    include_recommendations = EXCLUDED.include_recommendations,
    is_active = EXCLUDED.is_active,
    next_due_at = EXCLUDED.next_due_at
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.digest_my_preference()
RETURNS SETOF public.notification_digest_schedules
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT * FROM public.notification_digest_schedules WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.digest_due_recipients(_limit int DEFAULT 200)
RETURNS SETOF public.notification_digest_schedules LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.notification_digest_schedules
    WHERE is_active = true AND frequency <> 'off'
      AND (next_due_at IS NULL OR next_due_at <= now())
    ORDER BY next_due_at NULLS FIRST LIMIT GREATEST(LEAST(_limit, 1000), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.digest_mark_sent(
  _schedule_id uuid, _channel text, _item_count int, _payload jsonb, _status text DEFAULT 'sent',
  _error_message text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sched record; _run_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _sched FROM public.notification_digest_schedules WHERE id=_schedule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'schedule not found'; END IF;
  INSERT INTO public.notification_digest_runs(
    user_id, schedule_id, channel, status, item_count, payload, error_message
  ) VALUES (
    _sched.user_id, _schedule_id, _channel, COALESCE(_status,'sent'),
    COALESCE(_item_count,0), COALESCE(_payload,'{}'::jsonb), _error_message
  ) RETURNING id INTO _run_id;
  UPDATE public.notification_digest_schedules
     SET last_sent_at = now(),
         next_due_at = public._calc_digest_next_due(_sched.frequency, _sched.send_hour_local)
   WHERE id = _schedule_id;
  RETURN _run_id;
END;
$$;
