---
name: Birthday & Anniversary Reminder Cron
description: Edge function process-date-reminders inserts in-app notifications at T-7, T-1, T-0 for birthdays/anniversaries in IST, deduped by year+lead
type: feature
---
Edge function `supabase/functions/process-date-reminders` runs daily. Reads `profiles` where `dates_reminders_enabled = true` and either `birthday_md` or `anniversary_md` (MM-DD) is set. For each profile evaluates lead times **7, 1, 0 days** in IST and inserts a row into `notifications` with `type = 'date_reminder:<kind>:<year>:<lead>'`. The unique `type` per (user, kind, year, lead) gives natural idempotency — re-runs in the same day skip already-sent reminders. `verify_jwt = false` so cron can invoke without an auth token.
