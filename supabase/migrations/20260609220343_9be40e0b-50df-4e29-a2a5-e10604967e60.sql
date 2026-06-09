
CREATE TABLE IF NOT EXISTS public.reorder_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  interval_days integer NOT NULL DEFAULT 30,
  next_remind_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_reminded_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reorder_reminders TO authenticated;
GRANT ALL ON public.reorder_reminders TO service_role;

ALTER TABLE public.reorder_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reorder reminders"
  ON public.reorder_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reorder reminders"
  ON public.reorder_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reorder reminders"
  ON public.reorder_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reorder reminders"
  ON public.reorder_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_reorder_reminder()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.interval_days IS NULL OR NEW.interval_days < 7 OR NEW.interval_days > 365 THEN
    RAISE EXCEPTION 'interval_days must be between 7 and 365';
  END IF;
  IF length(coalesce(NEW.notes, '')) > 200 THEN
    RAISE EXCEPTION 'notes too long (max 200 chars)';
  END IF;
  NEW.updated_at := now();
  -- Recompute next_remind_at if interval changed or reminder was just re-enabled
  IF TG_OP = 'INSERT'
     OR NEW.interval_days IS DISTINCT FROM OLD.interval_days
     OR (NEW.enabled AND NOT OLD.enabled) THEN
    NEW.next_remind_at := COALESCE(NEW.last_reminded_at, now()) + (NEW.interval_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reorder_reminder ON public.reorder_reminders;
CREATE TRIGGER trg_validate_reorder_reminder
BEFORE INSERT OR UPDATE ON public.reorder_reminders
FOR EACH ROW EXECUTE FUNCTION public.validate_reorder_reminder();

-- Cron query: WHERE enabled = true AND next_remind_at <= now()
CREATE INDEX IF NOT EXISTS idx_reorder_reminders_due
  ON public.reorder_reminders (next_remind_at)
  WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_reorder_reminders_user
  ON public.reorder_reminders (user_id, created_at DESC);
