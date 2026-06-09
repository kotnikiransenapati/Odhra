---
name: Important Dates (birthday & anniversary)
description: Optional birthday/anniversary on profiles with month-day generated columns for fast cron lookups; ImportantDatesPanel auto-saves and shows days-to-go.
type: feature
---
- `public.profiles`: `birthday date`, `anniversary date`, `dates_reminders_enabled boolean default true`.
- Generated STORED columns `birthday_md` / `anniversary_md` (`MM-DD`) indexed (partial, only when set AND reminders enabled) so marketing cron can do `WHERE birthday_md = to_char(now(), 'MM-DD')` in ms.
- `trg_validate_profile_dates`: no future dates, no >120y old.
- `ImportantDatesPanel` in CustomerAccount: native date inputs (max=today), per-field auto-save with optimistic rollback on error, live "X days to go" hint, switch to disable reminders.
- Marketing cron (future) should query: `SELECT id, email FROM profiles WHERE dates_reminders_enabled AND birthday_md = to_char(now(), 'MM-DD')`.
