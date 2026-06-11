---
name: Backup Verification Log
description: Admin log of periodic backup restore-test results with stale-backup warnings and pass/fail audit
type: feature
---
Table `backup_verifications` (snapshot_id FK→backup_snapshots, snapshot_label, status pending/running/passed/failed, verified_rows, duration_ms, error_message, notes, verified_by, started_at, completed_at).

RPCs (gated by `admin_has_permission('manage_admins')`):
- `admin_backup_verifications_stats()` → totals, pending, passed_7d, failed_7d, last_passed_at
- `admin_backup_verifications_list(_limit)`
- `admin_record_backup_verification(snapshot_id, label, status, rows, duration_ms, error, notes)` → auto-sets started/completed timestamps based on status, audit-logged

UI: `BackupVerificationLog.tsx` (Admin → System → Backup Verifications). Destructive banner when last passed verification is older than 7 days. Status badges with icons. Dialog to record verifications manually (or via scheduled job calling the RPC with service role).
