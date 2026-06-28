
CREATE TABLE IF NOT EXISTS public.attribution_touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id text,
  source text NOT NULL,
  medium text,
  campaign text,
  content text,
  term text,
  referrer text,
  landing_path text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attr_user_time ON public.attribution_touchpoints(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_attr_anon_time ON public.attribution_touchpoints(anonymous_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_attr_campaign ON public.attribution_touchpoints(campaign);

GRANT SELECT, INSERT ON public.attribution_touchpoints TO authenticated;
GRANT INSERT ON public.attribution_touchpoints TO anon;
GRANT ALL ON public.attribution_touchpoints TO service_role;

ALTER TABLE public.attribution_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own touchpoints" ON public.attribution_touchpoints
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "anon insert touchpoints" ON public.attribution_touchpoints
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "users read own touchpoints" ON public.attribution_touchpoints
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read all touchpoints" ON public.attribution_touchpoints
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.scheduled_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','push','whatsapp','notification')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_scheduled_due ON public.scheduled_sends(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_user ON public.scheduled_sends(user_id);

GRANT SELECT ON public.scheduled_sends TO authenticated;
GRANT ALL ON public.scheduled_sends TO service_role;

ALTER TABLE public.scheduled_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own scheduled" ON public.scheduled_sends
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage scheduled" ON public.scheduled_sends
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.compute_order_attribution(_lookback_days int DEFAULT 30)
RETURNS TABLE (
  campaign text, source text, medium text,
  first_touch_revenue numeric, last_touch_revenue numeric,
  linear_revenue numeric, conversions int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH paid_orders AS (
    SELECT o.id, o.customer_id AS user_id, o.total_amount, o.created_at
    FROM public.orders o
    WHERE o.payment_status = 'paid'
      AND o.created_at >= now() - (_lookback_days || ' days')::interval
  ),
  touches AS (
    SELECT po.id AS order_id, po.total_amount,
           t.campaign, t.source, t.medium, t.occurred_at,
           ROW_NUMBER() OVER (PARTITION BY po.id ORDER BY t.occurred_at ASC) AS rn_first,
           ROW_NUMBER() OVER (PARTITION BY po.id ORDER BY t.occurred_at DESC) AS rn_last,
           COUNT(*) OVER (PARTITION BY po.id) AS n_touches
    FROM paid_orders po
    JOIN public.attribution_touchpoints t
      ON t.user_id = po.user_id
     AND t.occurred_at <= po.created_at
     AND t.occurred_at >= po.created_at - interval '30 days'
  )
  SELECT
    COALESCE(campaign,'(direct)'), COALESCE(source,'(direct)'), COALESCE(medium,'(none)'),
    SUM(CASE WHEN rn_first = 1 THEN total_amount ELSE 0 END)::numeric,
    SUM(CASE WHEN rn_last = 1 THEN total_amount ELSE 0 END)::numeric,
    SUM(total_amount / NULLIF(n_touches,0))::numeric,
    COUNT(DISTINCT order_id)::int
  FROM touches
  GROUP BY 1,2,3
  ORDER BY 6 DESC NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.compute_order_attribution(int) FROM public;
GRANT EXECUTE ON FUNCTION public.compute_order_attribution(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_optimal_send_hour(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'Asia/Kolkata')::int AS hr
    FROM public.attribution_touchpoints
    WHERE user_id = _user_id AND occurred_at >= now() - interval '60 days'
    GROUP BY hr ORDER BY COUNT(*) DESC LIMIT 1
  ), 10);
$$;
REVOKE ALL ON FUNCTION public.user_optimal_send_hour(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.user_optimal_send_hour(uuid) TO authenticated, service_role;
