---
name: Service Health Probes
description: Synthetic monitoring for external dependencies with manual run, latency tracking, and consecutive failure counter
type: feature
---
Tables:
- `service_health_probes` (name UNIQUE, url, method GET/POST/HEAD, expected_status, timeout_ms 100-60000, interval_seconds ≥30, last_status ok/degraded/down, last_latency_ms, consecutive_failures)
- `service_health_probe_results` (probe_id FK, status_code, latency_ms, success, error_message)

RPCs:
- `admin_probes_stats()` / `admin_probes_list()` — gated by `view_error_monitoring`
- `admin_upsert_probe(...)` / `admin_delete_probe(_id)` — gated by `manage_admins`, audit logged
- `admin_record_probe_result(probe_id, status_code, latency_ms, success, error)` — derives last_status: success+latency>3000 = degraded, success = ok, else down. Resets/increments consecutive_failures.

UI: `ServiceHealthProbes.tsx` (Admin → System → Service Health Probes). KPI tiles (ok/degraded/down counters), CRUD dialog, per-row "Run" button executes a `fetch` with `mode: 'no-cors'` from the browser and records the result. Production should also have an edge function cron worker calling `admin_record_probe_result` server-side for true synthetic checks.
