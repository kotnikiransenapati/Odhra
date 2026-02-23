
-- Translations table for database-driven i18n with admin overrides
CREATE TABLE public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'common',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(language_code, namespace, key)
);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Public read for all translations
CREATE POLICY "Translations are publicly readable"
ON public.translations FOR SELECT USING (true);

-- Admins can manage translations
CREATE POLICY "Admins can manage translations"
ON public.translations FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_translations_lang_ns ON public.translations(language_code, namespace);

-- Trigger for updated_at
CREATE TRIGGER update_translations_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
