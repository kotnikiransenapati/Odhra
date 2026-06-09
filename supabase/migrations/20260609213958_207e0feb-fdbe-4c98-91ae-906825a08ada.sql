ALTER TABLE public.email_preferences
  ADD COLUMN IF NOT EXISTS dnd_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start time NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end time NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata';

CREATE OR REPLACE FUNCTION public.is_in_quiet_hours(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pref record;
  local_now time;
BEGIN
  SELECT dnd_enabled, quiet_hours_start, quiet_hours_end, timezone
    INTO pref
  FROM public.email_preferences
  WHERE user_id = _user_id;

  IF NOT FOUND OR NOT pref.dnd_enabled THEN
    RETURN false;
  END IF;

  BEGIN
    local_now := (now() AT TIME ZONE pref.timezone)::time;
  EXCEPTION WHEN OTHERS THEN
    local_now := (now() AT TIME ZONE 'Asia/Kolkata')::time;
  END;

  IF pref.quiet_hours_start = pref.quiet_hours_end THEN
    RETURN false;
  ELSIF pref.quiet_hours_start < pref.quiet_hours_end THEN
    RETURN local_now >= pref.quiet_hours_start AND local_now < pref.quiet_hours_end;
  ELSE
    -- overnight window (e.g. 22:00 -> 07:00)
    RETURN local_now >= pref.quiet_hours_start OR local_now < pref.quiet_hours_end;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_in_quiet_hours(uuid) TO authenticated, service_role;