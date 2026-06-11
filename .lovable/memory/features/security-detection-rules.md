---
name: Security Detection Rules
description: Threshold-based security_detection_rules and findings workflow for event correlation
type: feature
---
Phase G Batch 52 adds threshold correlation over the security event ledger.

- `security_detection_rules` defines source/event_type filters, windows, thresholds, group_by keys, severity, cooldown, and active state.
- `evaluate_security_detection_rules()` creates deduplicated `security_detection_findings` when event thresholds are crossed.
- Findings support `open`, `acknowledged`, and `resolved` states through `admin_update_security_finding_status`.
- Rule management is restricted to `manage_admins`; findings can be read by `view_error_monitoring` or `manage_admins`.
- The UI is `SecurityDetectionRules` under Admin → System → Security Detections.