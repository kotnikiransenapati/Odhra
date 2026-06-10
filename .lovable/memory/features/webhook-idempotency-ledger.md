---
name: Webhook idempotency ledger
description: `public.webhook_events` table + `claim_webhook_event` / `mark_webhook_processed` RPCs to dedupe external webhook retries (Razorpay, Delhivery, Shiprocket, India Post, etc.).
type: feature
---
- Table: `public.webhook_events (provider, event_id, event_type, payload jsonb, status, error, processed_at, created_at)` with UNIQUE `(provider, event_id)` and index on `(provider, status, created_at desc)`.
- RLS: only admins SELECT, only service_role mutates.
- RPC `claim_webhook_event(_provider, _event_id, _event_type, _payload)` returns `true` on first delivery, `false` on duplicate via `ON CONFLICT DO NOTHING ... RETURNING true`. SECURITY DEFINER, granted only to service_role.
- RPC `mark_webhook_processed(_provider, _event_id, _status, _error)` updates final status (`processed | failed | skipped`).
- Shared helper: `supabase/functions/_shared/webhookIdempotency.ts` exports `claimWebhookEvent`, `markWebhookProcessed`, `createServiceClient`.
- Integrations:
  - `razorpay-webhook` keys on `x-razorpay-event-id` (falls back to payment/refund entity id) — duplicates return 200 with `{status:"duplicate"}`.
  - `delivery-webhook` keys on `${awb}:${status}:${timestamp}` per partner.
- Future webhooks (India Post, Stripe parity, etc.) MUST claim before processing and mark on success.
