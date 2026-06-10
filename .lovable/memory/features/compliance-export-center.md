---
name: Compliance Export Center
description: Admin-initiated GDPR/CCPA subject access requests with audit logging, scope selection, 7-day expiry, and downloadable files
type: feature
---
- Table `compliance_export_requests` (subject_user_id, subject_email, request_type, status, scopes[], file_url, file_size_bytes, reason, requested_by, processed_at, expires_at, error_message).
- request_type ∈ gdpr_sar | ccpa | internal_audit | legal_hold. status ∈ pending | processing | ready | failed | expired.
- RPCs: `admin_create_export_request(_subject_user_id, _request_type, _scopes, _reason)` returns new id, sets 7-day expiry, audit-logs to `audit_logs` with action `compliance_export_requested`. `admin_list_export_requests(_limit)` lists last N.
- All RPCs SECURITY DEFINER, gated by `has_role(auth.uid(),'admin')`, EXECUTE revoked from PUBLIC and granted to authenticated/service_role.
- Admin UI: `ComplianceExportCenter.tsx` mounted at tab id `compliance-exports` under `manage_admins` permission. KPI cards (total/open/ready/failed), scope chip toggles, request type selector.
