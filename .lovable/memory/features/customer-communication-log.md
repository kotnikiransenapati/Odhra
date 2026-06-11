---
name: Customer Communication Log
description: Unified admin timeline of all email/sms/push/whatsapp messages sent to a customer
type: feature
---
No new table — aggregates existing delivery tables:
- `email_delivery_events` (matched by recipient_email = auth.users.email)
- `sms_delivery_events` (user_id)
- `push_delivery_events` (user_id)
- `whatsapp_messages` (user_id)

RPCs (SECURITY DEFINER, gated by `view_customers`):
- `admin_customer_communications(_user_id,_channel,_limit)` → unified rows {channel, occurred_at, status, subject, recipient, provider_id, metadata}; channel = all/email/sms/push/whatsapp
- `admin_customer_communications_stats(_user_id)` → per-channel counts + last_email_at / last_whatsapp_at

UI: `CustomerCommunicationLog.tsx` — embeddable in Customer 360. KPI tiles per channel + filterable timeline with status badges (delivered/bounced/failed coloring).
