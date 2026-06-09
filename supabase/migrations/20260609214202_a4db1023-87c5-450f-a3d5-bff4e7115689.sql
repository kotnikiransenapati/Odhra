ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS delivery_instructions text,
  ADD COLUMN IF NOT EXISTS leave_unattended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_delivery_window text NOT NULL DEFAULT 'any';

CREATE OR REPLACE FUNCTION public.validate_profile_delivery_prefs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_instructions IS NOT NULL AND length(NEW.delivery_instructions) > 280 THEN
    RAISE EXCEPTION 'delivery_instructions must be 280 characters or fewer';
  END IF;
  IF NEW.preferred_delivery_window NOT IN ('any','morning','afternoon','evening','weekend') THEN
    RAISE EXCEPTION 'preferred_delivery_window must be any|morning|afternoon|evening|weekend';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_delivery_prefs ON public.profiles;
CREATE TRIGGER trg_validate_profile_delivery_prefs
  BEFORE INSERT OR UPDATE OF delivery_instructions, preferred_delivery_window
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_delivery_prefs();