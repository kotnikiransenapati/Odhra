---
name: Notification templates registry
description: Versioned, multi-channel (in_app/email/push/sms/whatsapp) notification templates with `{{var}}` interpolation.
type: feature
---
- Table: `notification_templates` unique on `(code, channel, version, locale)`.
- `variables` jsonb is a documented list of expected tokens (free-form).
- RPCs (`send_notifications`): `admin_upsert_notification_template`, `admin_toggle_notification_template`,
  `admin_delete_notification_template`, `admin_render_notification_template(code, channel, locale, vars)`.
- Renderer picks the highest `version` with `is_active = true`. Tokens use `{{name}}` and are replaced via `replace()`.
- UI: `src/components/admin/NotificationTemplatesRegistry.tsx` → Admin → System → Notification Templates.
  Includes a Preview dialog that calls the render RPC with admin-provided JSON variables.
