---
name: Edge Performance Dashboard
description: Per-function latency & error telemetry — edge_function_metrics + withEdgeMetrics() handler wrapper + admin dashboard with p50/p95/p99 and recharts trend
type: feature
---
- Table `edge_function_metrics(function_name, status_code, duration_ms, error_code, bucket_minute)`.
- Writes via SECURITY DEFINER `record_edge_metric()` (service_role only).
- Aggregations:
  - `admin_edge_metrics_summary(_hours)` — invocations, 5xx errors, error_rate %, p50/p95/p99/avg/max, last_seen.
  - `admin_edge_metrics_trend(_function_name, _hours)` — per-minute time series.
- Edge helper `supabase/functions/_shared/edgeMetrics.ts` exports `recordEdgeMetric()` and `withEdgeMetrics(name, handler)` — wraps a `serve()` handler, captures status+latency, fire-and-forget insert in `finally`.
- UI: `src/components/admin/EdgePerformanceDashboard.tsx` — KPI cards, click-through trend chart (Recharts LineChart with dual Y axis), error-row highlighting when error_rate > 1%.
- Admin route id: `edge-performance`, permission `view_error_monitoring`.
- Retention: `cleanup_old_edge_metrics(_days=14)`.
