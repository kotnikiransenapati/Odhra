---
name: Audit Log Query RPC
description: Admin-only admin_audit_query RPC powering structured filtering (admin/action/entity/search/date range) over audit_logs with paginated total_count
type: feature
---
- `public.admin_audit_query(_admin_id, _action, _entity_type, _entity_id, _search, _from, _to, _limit, _offset)` SECURITY DEFINER
- Caller must pass `_caller_is_active_admin()`; otherwise raises 42501
- `_search` does ILIKE across action/entity_type/entity_id and JSONB old_values/new_values cast to text
- Returns rows + total_count (window aggregate via CTE)
- Supporting indexes: `idx_audit_logs_created_desc`, `idx_audit_logs_entity (entity_type, entity_id)`, `idx_audit_logs_admin (admin_id, created_at DESC)`
- Replace direct table queries in `AuditLogViewer` with this RPC when adding advanced filters
