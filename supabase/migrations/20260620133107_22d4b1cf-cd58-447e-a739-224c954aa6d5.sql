
CREATE TABLE IF NOT EXISTS public.personalization_rails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rail_key TEXT NOT NULL,
  title TEXT NOT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  score NUMERIC NOT NULL DEFAULT 0,
  algorithm TEXT NOT NULL DEFAULT 'hybrid',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rail_key)
);
CREATE INDEX IF NOT EXISTS idx_personalization_rails_user ON public.personalization_rails(user_id, expires_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personalization_rails TO authenticated;
GRANT ALL ON public.personalization_rails TO service_role;
ALTER TABLE public.personalization_rails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own rails" ON public.personalization_rails FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service manages rails" ON public.personalization_rails FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.merchandising_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global','category','collection','search','vendor')),
  scope_value TEXT,
  action TEXT NOT NULL CHECK (action IN ('pin','boost','bury','hide')),
  product_ids UUID[] NOT NULL DEFAULT '{}',
  weight NUMERIC NOT NULL DEFAULT 1.0,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_merch_rules_active ON public.merchandising_rules(is_active, scope_type, priority);

GRANT SELECT ON public.merchandising_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.merchandising_rules TO authenticated;
GRANT ALL ON public.merchandising_rules TO service_role;
ALTER TABLE public.merchandising_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active rules" ON public.merchandising_rules FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage rules" ON public.merchandising_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_personalization_rails_updated BEFORE UPDATE ON public.personalization_rails FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_merch_rules_updated BEFORE UPDATE ON public.merchandising_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
