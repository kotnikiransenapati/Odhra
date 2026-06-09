
CREATE TABLE public.product_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 2000),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_notes TO authenticated;
GRANT ALL ON public.product_notes TO service_role;

ALTER TABLE public.product_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own product notes"
  ON public.product_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own product notes"
  ON public.product_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own product notes"
  ON public.product_notes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own product notes"
  ON public.product_notes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_product_notes_user_pinned
  ON public.product_notes (user_id, pinned DESC, updated_at DESC);

CREATE TRIGGER trg_product_notes_updated_at
  BEFORE UPDATE ON public.product_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
