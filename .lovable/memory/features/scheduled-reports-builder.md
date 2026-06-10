---
name: Scheduled Reports Builder
description: Recurring KPI report scheduler with admin RPCs and nightly-maintenance advance loop
type: feature
---
- Table: existing `scheduled_reports` (admin-managed).
- RPCs (all `SECURITY DEFINER`, gated by `admin_has_permission(auth.uid(),'view_analytics')`):
  - `admin_schedule_report(_name,_report_type,_frequency,_format,_recipients,_filters,_next_run_at)`
  - `admin_toggle_scheduled_report(_id,_active)`
  - `admin_delete_scheduled_report(_id)`
  - `admin_process_due_scheduled_reports()` — advances `last_sent_at`/`next_run_at` per frequency (daily/weekly/monthly/quarterly).
- Every mutation writes an `audit_logs` row (`scheduled_report.*` actions).
- UI: `src/components/admin/ScheduledReportsBuilder.tsx`, admin tab id `scheduled-reports`.
- Pipeline: nightly-maintenance step 8 invokes `admin_process_due_scheduled_reports`.
