---
name: API Key Usage Analytics
description: Admin telemetry dashboard for API key call volume, error rates, latency (avg/p95), top endpoints, and recent calls
type: feature
---
Table `api_key_usage_events` (api_key_id FK→api_keys, endpoint, method, status_code, latency_ms, ip_address, user_agent, error_message). Indexed by created_at desc and (api_key_id, created_at desc).

RPCs (all gated by `admin_has_permission('view_error_monitoring')`):
- `admin_api_key_usage_stats()` → 24h totals, errors, unique_keys, avg/p95 latency
- `admin_api_key_usage_recent(_limit)` → last N events (max 500)
- `admin_api_key_usage_by_endpoint()` → top 25 endpoints with calls/errors/avg_latency

UI: `ApiKeyUsageAnalytics.tsx` (Admin → System → API Key Usage). 5 KPI tiles, top-endpoints table, recent-calls table. Shows a destructive banner when 24h error rate exceeds 10%.

Inserts: authenticated role can write (edge functions log call results); reads gated to admins.
