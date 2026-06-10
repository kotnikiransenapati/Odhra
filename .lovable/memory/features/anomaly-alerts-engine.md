---
name: Anomaly Alerts Engine
description: anomaly_alert_rules + anomaly_alerts with admin_run_anomaly_detection RPC, nightly job integration, and admin alert UI
type: feature
---
- Tables: `anomaly_alert_rules` and `anomaly_alerts` are admin-only; backend service can materialize alerts.
- Metrics supported: `error_count`, `error_rate`, `p95_latency_ms`, `heartbeat_stale`, and `open_circuit_count`.
- `admin_run_anomaly_detection(_dry_run)` evaluates enabled rules with window/baseline/cooldown logic; nightly maintenance runs it after telemetry cleanup.
- `admin_set_anomaly_alert_status(_id,_status)` supports `acknowledged`, `resolved`, and `suppressed` with audit logging.
- UI: `src/components/admin/AnomalyAlertsPanel.tsx`, admin tab id `anomaly-alerts`, permission `view_error_monitoring`.