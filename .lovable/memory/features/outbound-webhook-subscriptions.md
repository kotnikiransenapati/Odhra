---
name: Outbound webhook subscriptions
description: Admin-managed external webhook endpoints with HMAC secret, retries, and delivery logging.
type: feature
---
- Tables:
  - `outbound_webhook_subscriptions` (https-only `target_url`, `event_types[]`, auto-generated `secret` (hex/32), `max_retries`, `timeout_ms`, `consecutive_failures`).
  - `outbound_webhook_deliveries` per-attempt log: `status_code`, `response_body`, `success`, `error`, `duration_ms`.
- RPCs (`manage_admins`): `admin_upsert_webhook_subscription`, `admin_rotate_webhook_secret` (returns plaintext once),
  `admin_toggle_webhook_subscription`, `admin_delete_webhook_subscription`. Stats RPC: `admin_webhook_delivery_stats(_id,_hours)`.
- Rotate dialog shows secret only once (copy-to-clipboard).
- Edge function consumers should HMAC-SHA256 the JSON payload with the row `secret` and send as `x-signature`.
- UI: `src/components/admin/OutboundWebhookSubscriptions.tsx` → Admin → System → Outbound Webhooks.
