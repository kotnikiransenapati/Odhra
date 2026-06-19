
-- =====================================================
-- BATCH 79: Customer Birthday Rewards
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday_month INT CHECK (birthday_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS birthday_day INT CHECK (birthday_day BETWEEN 1 AND 31);

CREATE TABLE public.birthday_reward_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  loyalty_points INT NOT NULL DEFAULT 200 CHECK (loyalty_points >= 0),
  discount_percent INT NOT NULL DEFAULT 15 CHECK (discount_percent BETWEEN 0 AND 90),
  code_valid_days INT NOT NULL DEFAULT 14 CHECK (code_valid_days BETWEEN 1 AND 90),
  window_days INT NOT NULL DEFAULT 0 CHECK (window_days BETWEEN 0 AND 7),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.birthday_reward_config(id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.birthday_reward_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_year INT NOT NULL,
  points_awarded INT NOT NULL DEFAULT 0,
  discount_code TEXT,
  discount_percent INT,
  code_expires_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_year)
);

CREATE INDEX idx_birthday_issuances_user ON public.birthday_reward_issuances(user_id);

GRANT SELECT, UPDATE ON public.birthday_reward_config TO authenticated;
GRANT ALL ON public.birthday_reward_config TO service_role;
GRANT SELECT ON public.birthday_reward_issuances TO authenticated;
GRANT ALL ON public.birthday_reward_issuances TO service_role;

ALTER TABLE public.birthday_reward_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_reward_issuances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read birthday config" ON public.birthday_reward_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update birthday config" ON public.birthday_reward_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own birthday issuances" ON public.birthday_reward_issuances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Process birthdays today: idempotent (UNIQUE user_id, reward_year)
CREATE OR REPLACE FUNCTION public.process_birthday_rewards()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cfg RECORD;
  _today DATE := CURRENT_DATE;
  _year INT := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  _issued INT := 0;
  _skipped INT := 0;
  _rec RECORD;
  _code TEXT;
BEGIN
  SELECT * INTO _cfg FROM public.birthday_reward_config WHERE id = 1;
  IF _cfg.id IS NULL OR NOT _cfg.enabled THEN
    RETURN jsonb_build_object('enabled', false, 'issued', 0);
  END IF;

  FOR _rec IN
    SELECT p.id AS user_id
    FROM public.profiles p
    WHERE p.birthday_month = EXTRACT(MONTH FROM _today)::int
      AND p.birthday_day = EXTRACT(DAY FROM _today)::int
      AND NOT EXISTS (
        SELECT 1 FROM public.birthday_reward_issuances i
        WHERE i.user_id = p.id AND i.reward_year = _year
      )
  LOOP
    _code := 'BDAY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    INSERT INTO public.birthday_reward_issuances(user_id, reward_year, points_awarded, discount_code, discount_percent, code_expires_at)
    VALUES (_rec.user_id, _year, _cfg.loyalty_points, _code, _cfg.discount_percent, now() + (_cfg.code_valid_days || ' days')::interval);

    -- Award loyalty points (best-effort; ignore failures so one user doesn't break batch)
    BEGIN
      INSERT INTO public.loyalty_transactions(user_id, points, transaction_type, reason)
      VALUES (_rec.user_id, _cfg.loyalty_points, 'earned', 'birthday_reward');
    EXCEPTION WHEN OTHERS THEN
      _skipped := _skipped + 1;
    END;

    _issued := _issued + 1;
  END LOOP;

  RETURN jsonb_build_object('enabled', true, 'issued', _issued, 'skipped', _skipped, 'date', _today);
END; $$;

-- Customer-facing summary of own birthday rewards
CREATE OR REPLACE FUNCTION public.my_birthday_rewards()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.issued_at DESC), '[]'::jsonb) INTO _r
  FROM (SELECT * FROM public.birthday_reward_issuances WHERE user_id = auth.uid()) t;
  RETURN _r;
END; $$;

-- =====================================================
-- BATCH 80: Admin Dashboard Widgets
-- =====================================================
CREATE TABLE public.admin_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_key TEXT NOT NULL,
  title TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  size TEXT NOT NULL DEFAULT 'medium' CHECK (size IN ('small','medium','large','full')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admin_id, widget_key)
);

CREATE INDEX idx_admin_dashboard_widgets_admin ON public.admin_dashboard_widgets(admin_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_dashboard_widgets TO authenticated;
GRANT ALL ON public.admin_dashboard_widgets TO service_role;

ALTER TABLE public.admin_dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own widgets" ON public.admin_dashboard_widgets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE TRIGGER trg_admin_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.admin_dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default widgets for new admin
CREATE OR REPLACE FUNCTION public.admin_widgets_seed()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COUNT(*) INTO _count FROM public.admin_dashboard_widgets WHERE admin_id = auth.uid();
  IF _count = 0 THEN
    INSERT INTO public.admin_dashboard_widgets(admin_id, widget_key, title, position, size) VALUES
      (auth.uid(), 'kpi_revenue', 'Revenue Today', 0, 'small'),
      (auth.uid(), 'kpi_orders', 'Orders Today', 1, 'small'),
      (auth.uid(), 'kpi_customers', 'New Customers', 2, 'small'),
      (auth.uid(), 'kpi_aov', 'Average Order Value', 3, 'small'),
      (auth.uid(), 'chart_revenue_7d', 'Revenue (7d)', 4, 'large'),
      (auth.uid(), 'recent_orders', 'Recent Orders', 5, 'medium'),
      (auth.uid(), 'low_stock', 'Low Stock Alerts', 6, 'medium'),
      (auth.uid(), 'pending_reviews', 'Pending Reviews', 7, 'small')
    ON CONFLICT (admin_id, widget_key) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('seeded', _count = 0);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_widgets_list()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.position, t.created_at), '[]'::jsonb) INTO _r
  FROM (SELECT * FROM public.admin_dashboard_widgets WHERE admin_id = auth.uid()) t;
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_widgets_reorder(_ids UUID[])
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _i INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  FOR _i IN 1..array_length(_ids, 1) LOOP
    UPDATE public.admin_dashboard_widgets SET position = _i - 1
    WHERE id = _ids[_i] AND admin_id = auth.uid();
  END LOOP;
  RETURN true;
END; $$;
