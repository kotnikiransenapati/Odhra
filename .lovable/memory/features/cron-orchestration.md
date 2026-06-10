---
name: Cron Orchestration
description: pg_cron + pg_net schedules invoking edge functions for nightly maintenance, back-in-stock alerts, and loyalty expiry reminders
type: feature
---
Scheduled jobs (created via supabase--insert, not migration, since URLs/keys are project-specific):
- `nightly-maintenance-daily` → 02:30 UTC → `nightly-maintenance` (forecasts, scorecards, segments, webhook GC)
- `back-in-stock-alerts-15min` → every 15 min → `process-back-in-stock-alerts`
- `loyalty-expiry-reminders-daily` → 09:00 UTC → `process-loyalty-expiry-reminders`
Extensions enabled in `extensions` schema: `pg_cron`, `pg_net`. Inspect/manage via `cron.job` and `cron.unschedule(name)`.
