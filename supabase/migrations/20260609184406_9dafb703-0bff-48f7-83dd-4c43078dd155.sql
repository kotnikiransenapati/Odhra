
CREATE TABLE public.broadcast_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 500),
  variant text NOT NULL DEFAULT 'info' CHECK (variant IN ('info','warning','success','error')),
  link_url text,
  link_label text,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','customers','vendors','admins')),
  dismissible boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_broadcast_banners_active ON public.broadcast_banners(enabled, starts_at, ends_at);
GRANT SELECT ON public.broadcast_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.broadcast_banners TO authenticated;
GRANT ALL ON public.broadcast_banners TO service_role;
ALTER TABLE public.broadcast_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read active banners" ON public.broadcast_banners FOR SELECT
  USING (enabled = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Admins read all banners" ON public.broadcast_banners FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage banners" ON public.broadcast_banners FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_broadcast_banners_updated_at BEFORE UPDATE ON public.broadcast_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
