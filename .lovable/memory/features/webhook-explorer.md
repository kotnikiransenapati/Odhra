---
name: Webhook Explorer
description: Admin webhook_events explorer with filters, payload inspection, and DLQ replay queueing
type: feature
---
Phase G Batch 17 adds an admin-only webhook explorer.

- Backend RPC `admin_webhook_events` filters webhook deliveries by provider, status, search term, and pagination.
- Backend RPC `admin_webhook_requeue` audit-logs manual replay requests and creates a `dead_letter_queue` job with `job_type='webhook_replay'`.
- Admin UI `WebhookExplorer` lives under Admin → System → Webhook Explorer.
- Webhook replay is queued for controlled processing rather than directly re-firing provider side effects from the browser.