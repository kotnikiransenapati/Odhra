---
name: Admin Action Approval Queue
description: Four-eyes principle for high-risk admin actions with 24h expiry
type: feature
---
- Table: `public.admin_action_approvals` (action_type, description, payload jsonb, requested_by, status pending|approved|denied|expired|executed, reviewed_by, reviewed_at, review_notes, expires_at default now()+24h).
- RLS: admins read; requester (with manage_admins) inserts.
- RPCs:
  - `admin_request_approval(action_type, description, payload)` — creates pending request, audit-logged.
  - `admin_decide_approval(id, approve, notes)` — second admin only (requester cannot self-approve), updates status + audit.
  - `admin_approvals_stats()` — auto-expires stale pendings, returns rollup.
- UI: `src/components/admin/AdminApprovalQueue.tsx`, tab id `admin-approvals` (Admin → System).
