---
name: Security Event Ledger
description: Tamper-evident security_event_ledger with hash-chain verification and admin feed
type: feature
---
Phase G Batch 51 adds `security_event_ledger` for append-only security telemetry.

- Events are recorded through `record_security_event(...)`, normalized to lowercase source/event_type and severity-checked.
- Each row stores `previous_hash` and `event_hash` using `extensions.digest(..., 'sha256')` to support tamper-evident verification.
- `admin_security_event_stats`, `admin_security_event_feed`, and `admin_verify_security_ledger` power the admin UI.
- Reads are limited to admins with `view_error_monitoring` or `manage_admins`; chain verification requires `manage_admins`.
- The UI is `SecurityEventLedger` under Admin → System → Security Ledger.