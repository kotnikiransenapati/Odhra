---
name: Refund Approval Queue
description: Two-admin approval workflow for high-value or sensitive refund requests
type: feature
---
Table `refund_approval_requests`: order_id, refund_id, amount (>0), reason (3–1000), requested_by, status (pending/approved/rejected/cancelled), reviewer_id, reviewed_at, decision_note, priority (low/normal/high/urgent).

RLS: `manage_refunds` for select/insert/update; insert requires requested_by = auth.uid().

RPCs (SECURITY DEFINER):
- `admin_refund_approval_submit(_order_id,_amount,_reason,_priority,_refund_id)` → id
- `admin_refund_approval_decide(_id,_approve,_note)` — rejects self-approval
- `admin_refund_approval_stats()` → pending_total, pending_amount, urgent, my_pending, approved_7d, rejected_7d
- `admin_refund_approval_list(_status,_limit)` joined with orders, sorted pending-first then priority

UI: `RefundApprovalQueue.tsx` (Admin → Commerce → Refunds). Approve/Reject blocked for own requests with "awaiting peer" label.
