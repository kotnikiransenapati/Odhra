
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS anniversary date,
  ADD COLUMN IF NOT EXISTS dates_reminders_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday_md text
    GENERATED ALWAYS AS (
      CASE WHEN birthday IS NULL THEN NULL
           ELSE lpad(extract(month from birthday)::text, 2, '0') || '-' ||
                lpad(extract(day   from birthday)::text, 2, '0')
      END
    ) STORED;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anniversary_md text
    GENERATED ALWAYS AS (
      CASE WHEN anniversary IS NULL THEN NULL
           ELSE lpad(extract(month from anniversary)::text, 2, '0') || '-' ||
                lpad(extract(day   from anniversary)::text, 2, '0')
      END
    ) STORED;

CREATE OR REPLACE FUNCTION public.validate_profile_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.birthday IS NOT NULL THEN
    IF NEW.birthday > CURRENT_DATE THEN
      RAISE EXCEPTION 'birthday cannot be in the future';
    END IF;
    IF NEW.birthday < CURRENT_DATE - INTERVAL '120 years' THEN
      RAISE EXCEPTION 'birthday is unreasonably old';
    END IF;
  END IF;
  IF NEW.anniversary IS NOT NULL THEN
    IF NEW.anniversary > CURRENT_DATE THEN
      RAISE EXCEPTION 'anniversary cannot be in the future';
    END IF;
    IF NEW.anniversary < CURRENT_DATE - INTERVAL '120 years' THEN
      RAISE EXCEPTION 'anniversary is unreasonably old';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_dates ON public.profiles;
CREATE TRIGGER trg_validate_profile_dates
BEFORE INSERT OR UPDATE OF birthday, anniversary ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_dates();

CREATE INDEX IF NOT EXISTS idx_profiles_birthday_md
  ON public.profiles (birthday_md)
  WHERE birthday_md IS NOT NULL AND dates_reminders_enabled = true;

CREATE INDEX IF NOT EXISTS idx_profiles_anniversary_md
  ON public.profiles (anniversary_md)
  WHERE anniversary_md IS NOT NULL AND dates_reminders_enabled = true;
