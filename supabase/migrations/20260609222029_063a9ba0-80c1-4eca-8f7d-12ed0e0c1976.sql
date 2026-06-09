
CREATE TABLE public.review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('up','down')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_votes TO authenticated;
GRANT ALL ON public.review_votes TO service_role;

ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own review votes"
  ON public.review_votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own review votes"
  ON public.review_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own review votes"
  ON public.review_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own review votes"
  ON public.review_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_review_votes_review ON public.review_votes (review_id);

CREATE TRIGGER trg_review_votes_updated_at
  BEFORE UPDATE ON public.review_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recompute_review_helpful_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review_id uuid := COALESCE(NEW.review_id, OLD.review_id);
  v_score int;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN vote='up' THEN 1 WHEN vote='down' THEN -1 ELSE 0 END), 0)
    INTO v_score
  FROM public.review_votes
  WHERE review_id = v_review_id;

  UPDATE public.reviews
     SET helpful_count = v_score,
         updated_at = now()
   WHERE id = v_review_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_review_votes_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
  FOR EACH ROW EXECUTE FUNCTION public.recompute_review_helpful_count();
