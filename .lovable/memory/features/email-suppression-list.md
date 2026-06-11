---
name: Email Suppression List
description: Admin-managed blocklist of emails (bounce/complaint/unsubscribe/manual) with hit counters and toggle
type: feature
---
Table: `email_suppression_list` (UNIQUE email, reason CHECK, suppression_count, last_event_at, is_active).
RPCs: `admin_suppression_stats`, `admin_suppression_list(_search,_reason,_limit)`, `admin_add_suppression(_email,_reason,_notes)` (upsert increments count), `admin_toggle_suppression(_id,_active)`.
UI: `src/components/admin/EmailSuppressionList.tsx` (Admin → System → Email Suppression). Permission: `manage_admins`.
