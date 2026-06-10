---
name: Incident Management & Public Status
description: incidents/incident_updates tables, admin incident panel, /status public page consuming public_status_snapshot
type: feature
---
- Tables `incidents` (severity, status, affected_services, impact, public_summary, is_public) and `incident_updates` (timeline).
- Admin RPCs: `admin_create_incident`, `admin_post_incident_update` (SECURITY DEFINER, audit-logged).
- Public RPC: `public_status_snapshot` returns overall health (operational/degraded/major_outage), active+recent incidents, last 24h service heartbeats.
- Admin UI: `IncidentManagementPanel` (tab id `incidents`, permission `view_error_monitoring`) — declare, post timeline updates, resolve.
- Public page: `/status` auto-refreshes every 30s, lists active incidents, services, 14-day history.
