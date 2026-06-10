---
name: Cron Status Dashboard
description: Admin UI listing cron.job schedules with last-status, duration, and recent run history via admin_cron_status RPC
type: feature
---
- `public.admin_cron_status(_runs_per_job)` SECURITY DEFINER, admin-gated via `_caller_is_active_admin()`
- Reads from `cron.job` + `cron.job_run_details`; returns last status + jsonb array of recent runs
- UI: `CronDashboard.tsx` mounted under Admin → System → Cron Jobs (gated on `view_error_monitoring`)
- Failing job count surfaced in header; per-job accordion shows command, last message, recent runs with duration
