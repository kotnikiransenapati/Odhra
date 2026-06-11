---
name: Secret Rotation Scheduler
description: Admin scheduler for tracking sensitive secret rotation cadence with overdue/due-soon alerts and audit-logged rotation marking
type: feature
---
Table `secret_rotation_schedules` (secret_name unique, rotation_interval_days, last_rotated_at, next_due_at, owner_email, severity, is_active, notes).

RPCs (all gated by `admin_has_permission('manage_admins')`):
- `admin_secret_rotation_stats()` → total/active/overdue/due_soon/critical
- `admin_secret_rotation_list()` → ordered by overdue-first then next_due
- `admin_upsert_secret_rotation(...)` → creates/updates and resets next_due
- `admin_mark_secret_rotated(_id)` → updates last_rotated_at and bumps next_due by interval

UI: `SecretRotationScheduler.tsx` (Admin → System → Rotation Scheduler). KPI tiles, dialog for upsert, table with overdue row highlighting and "Mark Rotated" action.
Separate from existing `SecretRotationTracker` which reads `managed_secrets`; this one is a planning/cadence layer.
