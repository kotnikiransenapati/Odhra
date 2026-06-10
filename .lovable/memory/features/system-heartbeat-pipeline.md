---
name: System Heartbeat Pipeline
description: Liveness telemetry — system_heartbeats table + record_heartbeat RPC + withHeartbeat() edge helper + admin dashboard at System → Heartbeats
type: feature
---
- Table `system_heartbeats(service_name, service_kind, status[healthy|degraded|down|unknown], latency_ms, detail jsonb, observed_at)`.
- Writes only via SECURITY DEFINER `record_heartbeat()` (service_role).
- Admins read via `admin_latest_heartbeats(_within_minutes)` returning DISTINCT ON latest per service plus `is_stale` flag.
- Edge helper `supabase/functions/_shared/heartbeat.ts`: `recordHeartbeat()` + `withHeartbeat(name, kind, fn)` auto-times the unit of work and reports `down` with error detail on throw.
- Retention: `cleanup_old_heartbeats(_days=7)`.
- UI: `src/components/admin/SystemHeartbeatDashboard.tsx` — auto-refreshes every 20s, status summary cards, stale-window selector (5m/15m/1h/1d).
- Admin route id: `heartbeats`, permission `view_error_monitoring`.
