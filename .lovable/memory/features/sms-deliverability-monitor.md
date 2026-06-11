---
name: SMS deliverability monitor
description: Per-template and per-country SMS lifecycle telemetry with cost/segment tracking.
type: feature
---
- Table: `sms_delivery_events` with statuses `queued|sent|delivered|failed|undelivered`,
  provider/template/country_code, `segment_count`, `cost_cents`, recipient stored as hash only.
- RPCs (`view_error_monitoring`): `admin_sms_deliverability_stats(_hours)` returns KPIs +
  `top_templates` (top 10 by volume with delivery %) and `by_country` (top 10 with failure %),
  `admin_sms_recent_events(_limit,_status)` returns recent events filtered.
- Inserts restricted to `service_role` — edge functions should post events as soon as the provider
  webhook fires.
- UI: `src/components/admin/SmsDeliverabilityMonitor.tsx` → Admin → System → SMS Deliverability.
  Warns when failure rate exceeds 10%.
