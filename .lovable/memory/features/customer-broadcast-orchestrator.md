---
name: Customer Broadcast Orchestrator
description: customer_broadcasts scheduling with segmented in-app delivery, processing RPC, delivery counts, and admin UI
type: feature
---
- Table `customer_broadcasts` tracks name, title, body, channel, audience, status, scheduled_at, sent_at, total_recipients, delivered_count, failed_count, and metadata.
- RPCs: `admin_create_customer_broadcast`, `admin_process_due_customer_broadcasts`, and `admin_cancel_customer_broadcast`; all are SECURITY DEFINER, revoked from PUBLIC, and permission-gated by `send_notifications`.
- Processing creates `notifications` rows for due broadcasts, segmented by user roles for admins/vendors/customers, then records delivery totals.
- Nightly maintenance calls `admin_process_due_customer_broadcasts` after scheduled feature rollouts.
- Admin UI: `CustomerBroadcastOrchestrator.tsx`, tab id `customer-broadcasts`, permission `send_notifications`.