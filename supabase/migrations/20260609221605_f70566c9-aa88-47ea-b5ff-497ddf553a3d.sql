
-- ============== PRODUCT Q&A ==============

CREATE TABLE public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 5 AND 500),
  is_anonymous boolean NOT NULL DEFAULT false,
  is_answered boolean NOT NULL DEFAULT false,
  answer_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_questions TO authenticated;
GRANT ALL ON public.product_questions TO service_role;

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads visible questions"
  ON public.product_questions FOR SELECT
  USING (status = 'visible' OR auth.uid() = user_id);

CREATE POLICY "Users insert own questions"
  ON public.product_questions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own questions"
  ON public.product_questions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own questions"
  ON public.product_questions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_product_questions_product ON public.product_questions (product_id, created_at DESC);
CREATE INDEX idx_product_questions_user ON public.product_questions (user_id, created_at DESC);

CREATE TRIGGER trg_product_questions_updated_at
  BEFORE UPDATE ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.product_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 1000),
  is_vendor boolean NOT NULL DEFAULT false,
  helpful_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_answers TO authenticated;
GRANT ALL ON public.product_answers TO service_role;

ALTER TABLE public.product_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads visible answers"
  ON public.product_answers FOR SELECT
  USING (status = 'visible' OR auth.uid() = user_id);

CREATE POLICY "Users insert own answers"
  ON public.product_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own answers"
  ON public.product_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own answers"
  ON public.product_answers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_product_answers_question ON public.product_answers (question_id, created_at ASC);
CREATE INDEX idx_product_answers_user ON public.product_answers (user_id, created_at DESC);

CREATE TRIGGER trg_product_answers_updated_at
  BEFORE UPDATE ON public.product_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: auto-flag vendor answers + keep aggregate in sync on the question.
CREATE OR REPLACE FUNCTION public.handle_product_answer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_vendor_user uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    SELECT pq.product_id INTO v_product_id FROM public.product_questions pq WHERE pq.id = NEW.question_id;
    IF v_product_id IS NOT NULL THEN
      SELECT v.user_id INTO v_vendor_user
        FROM public.products p
        JOIN public.vendors v ON v.id = p.vendor_id
        WHERE p.id = v_product_id;
      IF v_vendor_user IS NOT NULL AND v_vendor_user = NEW.user_id THEN
        NEW.is_vendor := true;
      END IF;
    END IF;

    UPDATE public.product_questions
       SET answer_count = answer_count + 1,
           is_answered = true,
           updated_at = now()
     WHERE id = NEW.question_id;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.product_questions
       SET answer_count = GREATEST(answer_count - 1, 0),
           is_answered = (answer_count - 1) > 0,
           updated_at = now()
     WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_handle_product_answer_ins
  BEFORE INSERT ON public.product_answers
  FOR EACH ROW EXECUTE FUNCTION public.handle_product_answer();

CREATE TRIGGER trg_handle_product_answer_del
  AFTER DELETE ON public.product_answers
  FOR EACH ROW EXECUTE FUNCTION public.handle_product_answer();

-- ============== STYLE PROFILES ==============

CREATE TABLE public.style_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top_size text,
  bottom_size text,
  dress_size text,
  shoe_size text,
  preferred_fit text CHECK (preferred_fit IS NULL OR preferred_fit IN ('slim','regular','loose')),
  favorite_colors text[] NOT NULL DEFAULT '{}',
  avoid_materials text[] NOT NULL DEFAULT '{}',
  gifting_for_others boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.style_profiles TO authenticated;
GRANT ALL ON public.style_profiles TO service_role;

ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own style profile"
  ON public.style_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own style profile"
  ON public.style_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own style profile"
  ON public.style_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own style profile"
  ON public.style_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_style_profiles_updated_at
  BEFORE UPDATE ON public.style_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
