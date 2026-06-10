---
name: Webhook Replay Console
description: Admin console to requeue webhook_events and DLQ entries with audit logging
type: feature
---
- RPCs (`SECURITY DEFINER`, gated by `admin_has_permission(auth.uid(),'view_error_monitoring')`):
  - `admin_replay_webhook_event(_id)` — resets `webhook_events.status='pending'`, clears error/processed_at.
  - `admin_replay_dlq_entry(_id)` — resets `dead_letter_queue.status='pending'`, `next_retry_at=now()`.
  - `admin_resolve_dlq_entry(_id,_note)` — marks DLQ resolved with `resolved_by/at`.
- All actions emit `audit_logs` rows (`webhook_event.replay`, `dlq.replay`, `dlq.resolve`).
- Indexes: `idx_webhook_events_status_created`, `idx_dlq_status_created`.
- UI: `src/components/admin/WebhookReplayConsole.tsx`, admin tab id `webhook-replay` (tabs for webhooks vs DLQ).
