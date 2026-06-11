---
name: Admin Activity Heatmap
description: Hour-of-day x day-of-week heatmap of admin actions, rebuilt on demand from admin_audit_log
type: feature
---
Table: `admin_activity_hourly` (UNIQUE bucket_hour+admin_id+action_category, action_count, error_count).
RPCs: `refresh_admin_activity_heatmap(_days)` rebuilds buckets from `admin_audit_log` grouped by hour/admin/category. `admin_activity_heatmap_data(_days)` returns 7x24 grid. `admin_activity_heatmap_stats(_days)` returns totals, active admins, peak hour.
UI: `src/components/admin/AdminActivityHeatmap.tsx` (Admin → System → Activity Heatmap). 7-day default range, intensity scaled to max bucket. Permission: `view_audit_log`.
