---
name: Push Deliverability Monitor
description: Web/mobile push lifecycle telemetry with template/platform breakdown
type: feature
---
- Table: `public.push_delivery_events` (status: queued|sent|delivered|failed|clicked|dismissed|expired) with template_key, platform, provider, error_code.
- Indexes on occurred_at, status, template_key.
- RLS: admins with `view_error_monitoring` can read; service_role writes.
- RPCs (SECURITY DEFINER, gated by `view_error_monitoring`):
  - `admin_push_deliverability_stats(_hours)` — totals, delivery/click/failure rates, top 10 templates, platform breakdown.
  - `admin_push_recent_events(_limit, _only_failed)` — feed.
- UI: `src/components/admin/PushDeliverabilityMonitor.tsx`, tab id `push-deliverability` (Admin → System). Banner if failure rate ≥10%.
