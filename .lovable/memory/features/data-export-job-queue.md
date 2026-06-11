---
name: Data Export Job Queue
description: Admin async export queue for platform data with status tracking, JSON filters, downloadable file URLs, and 7-day expiry
type: feature
---
Table `data_export_jobs` (requested_by, resource_type, format csv/json/xlsx, filters jsonb, status queued/running/completed/failed/cancelled, progress 0-100, row_count, file_url, file_size_bytes, error_message, expires_at default +7d).

RPCs (gated by `admin_has_permission('manage_admins')`):
- `admin_export_jobs_stats()` → totals, queued/running, completed_24h, failed_24h
- `admin_export_jobs_list(_limit)` → recent jobs
- `admin_create_export_job(resource, format, filters)` → enqueues + audit logs
- `admin_cancel_export_job(_id)` → cancels queued/running

UI: `DataExportJobQueue.tsx` (Admin → System → Export Job Queue). Resource picker (orders/customers/products/etc.), format select, JSON filter editor, KPI tiles, status badges, download/cancel actions.

Note: Actual export worker (edge function) consumes queued rows; this is the orchestration layer.
