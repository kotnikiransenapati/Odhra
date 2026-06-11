---
name: Order SLA Breach Tracker
description: Detect and triage orders that exceed fulfillment/shipping/delivery SLA thresholds
type: feature
---
Table `order_sla_breaches` (UNIQUE order_id): breach_type (fulfillment/shipping/delivery/response), severity (low/medium/high/critical), hours_overdue, acknowledged_by/at, assigned_to, resolved_by/at, resolution_note.

Auto-detection: `detect_order_sla_breaches()` flags orders still pending/processing >48h or shipped >96h and UPSERTs into the table. Severity buckets: >168h=critical, >96h=high, >72h=medium, else low. Should be wired into pg_cron hourly.

RPCs (SECURITY DEFINER):
- `admin_sla_breaches_stats()` → open_total, critical, high, unacknowledged, assigned_to_me, resolved_24h
- `admin_sla_breaches_list(_status,_limit)` joined with orders (status: open/unacknowledged/resolved/all)
- `admin_sla_breach_acknowledge(_id,_assign_to_me)`
- `admin_sla_breach_resolve(_id,_note)`

UI: `OrderSLABreaches.tsx` (Admin → Commerce). KPI tiles, status filter, "Detect Now" trigger, deep link back to order.

Permissions: `view_orders` to read, `manage_orders` to mutate.
