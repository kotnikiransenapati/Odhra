---
name: Admin Notification Preferences
description: Per-admin alert subscription settings (channels, severity threshold, category filters, quiet hours)
type: feature
---
Table `admin_notification_preferences` (one row per admin via UNIQUE admin_user_id): channel_in_app/email/sms booleans, severity_threshold (low/medium/high/critical), categories text[], quiet_hours_start/end, timezone (default Asia/Kolkata), is_active.

RPCs:
- `get_my_admin_notification_prefs()` → auto-creates default row on first call
- `upsert_my_admin_notification_prefs(...)` → updates own prefs

RLS: admins manage own row; `manage_admins` can manage any.

UI: `AdminNotificationPreferences.tsx` (Admin → System → My Notification Prefs). Master switch, channels, severity threshold, clickable category badges, quiet-hours window with timezone. Open to any authenticated admin (no extra permission gate beyond entering the admin area).

Downstream notification dispatchers should read this table and skip sends when severity < threshold, channel disabled, category not in list, or current time within quiet hours.
