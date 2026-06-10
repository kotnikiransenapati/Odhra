---
name: Dead Letter Queue Admin
description: Admin UI + RPCs (admin_dlq_list/replay/discard) to inspect, retry, or discard failed background jobs in dead_letter_queue
type: feature
---
- RPCs are SECURITY DEFINER, gated on `_caller_is_active_admin()` (active row in admin_users)
- `admin_dlq_list(status, job_type, limit, offset)` returns paginated rows + total_count
- `admin_dlq_replay(id)` resets status to 'pending', clears resolved fields, sets next_retry_at=now
- `admin_dlq_discard(id, reason)` marks status='discarded'
- All mutations write an audit_logs entry (`dlq.replay` / `dlq.discard`)
- UI: `DeadLetterQueueViewer.tsx` mounted under Admin → System → Dead Letter Queue, gated on `view_error_monitoring`
- Indexes: `idx_dlq_status_created` on (status, created_at DESC)
