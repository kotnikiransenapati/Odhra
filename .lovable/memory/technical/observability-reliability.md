---
name: Observability & Reliability
description: Phase B — edge_function_metrics, slo_definitions, dead_letter_queue tables, edge_function_slo_rollup view, ObservabilityDashboard admin tab, withMetric/recordEdgeMetric helpers in src/lib/observability.ts
type: feature
---
- Use `withMetric(name, () => supabase.functions.invoke(...))` to instrument any client-side edge function call.
- p95/p99 rollups: `edge_function_slo_rollup` view (last hour). View is `security_invoker` — admins only via RLS.
- SLOs are evaluated client-side in `ObservabilityDashboard` against the rollup view; supports `latency_ms` (p95) and `error_rate`.
- DLQ resolution writes `status='resolved', resolved_at=now()` directly from the dashboard.
- Retention: call `prune_analytics_events(days)` via service_role (e.g. nightly pg_cron) — function is SECURITY DEFINER and EXECUTE is service_role only.
