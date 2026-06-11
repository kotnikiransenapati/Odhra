---
name: Email deliverability monitor
description: Tracks email lifecycle events (sent/delivered/bounced/complained/opened/clicked/failed) with admin dashboard for delivery, bounce, and open rates.
type: feature
---
- Table: `email_delivery_events` — recipient stored as hash (PII-safe), with `recipient_domain`, `template`, `provider`,
  `provider_message_id`, `status`, `bounce_type`, `error_message`, `metadata`, `occurred_at`.
- Indexes: `(status, occurred_at)`, `(template, occurred_at)`, `(recipient_domain, occurred_at)`, `(provider_message_id)`.
- RLS: read requires `view_error_monitoring`; only service role can insert (edge functions via Resend webhook).
- RPCs:
  `admin_email_deliverability_stats(_hours)` → totals, delivery/bounce/open counts, top templates, top domains with bounce rate;
  `admin_email_recent_events(_status,_template,_limit)` → recent stream (max 500).
- UI: `src/components/admin/EmailDeliverabilityMonitor.tsx` → Admin → System → Email Deliverability.
  Time-window selector (1h/24h/7d/30d), status filter, domains with bounce_rate > 5% flagged.
