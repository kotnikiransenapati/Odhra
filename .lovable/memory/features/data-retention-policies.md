---
name: Data retention policies
description: Admin-managed allow-listed retention policies that purge old rows (hard/soft) per table, executed nightly.
type: feature
---
- Table: `data_retention_policies` (unique by `table_name`).
- Allow-list enforced by `retention_allowed_table()` — covers analytics/error/webhook/audit/behavior/cron-style tables only.
- RPCs (all `SECURITY DEFINER`, gated on `manage_admins`):
  `admin_upsert_retention_policy`, `admin_toggle_retention_policy`,
  `admin_delete_retention_policy`, `admin_run_retention_policy(id)` (manual run, returns purged count),
  `admin_process_due_retention_policies()` (called by service role from `nightly-maintenance`,
  skips rows touched < 20h ago).
- Hard delete: `DELETE FROM <t> WHERE <date_col> < now() - <days>`. Soft delete sets `soft_delete_column = now()`.
- All operations write to `audit_logs`. Errors captured in `last_error`.
- UI: `src/components/admin/DataRetentionPolicies.tsx` → Admin → System → Data Retention.
