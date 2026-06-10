---
name: Backend Health admin dashboard
description: Admin-only Backend Health tab combining RLS coverage audit and 7-day webhook delivery stats. Powered by SECURITY DEFINER RPCs.
type: feature
---
- RPCs (admin-only via `has_role(auth.uid(),'admin')`):
  - `admin_rls_audit()` — per public table: `rls_enabled`, `policy_count`, `has_service_role_grant`, `has_authenticated_grant`, `has_anon_grant`, `approx_row_count`.
  - `admin_webhook_stats(_days)` — provider, total, processed, failed, duplicates, last_event_at.
- UI: `src/components/admin/BackendHealthDashboard.tsx` with summary tiles, issues table, healthy table, and webhook table.
- Severity rules:
  - destructive: RLS disabled OR `policy_count = 0`
  - warning: missing service_role grant OR single policy
  - healthy otherwise.
- Registered as nav item `backend-health` in `system` group of `src/pages/admin/AdminDashboard.tsx`, gated by `view_error_monitoring` permission, lazy-loaded.
