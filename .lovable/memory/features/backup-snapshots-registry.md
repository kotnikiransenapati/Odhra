---
name: Backup Snapshots Registry
description: Admin registry for database backup snapshots with retention windows, status lifecycle, restore tracking, and nightly expiry job
type: feature
---
Tracks DB backup metadata (not the backup execution itself).

**Table**: `public.backup_snapshots`
- Status lifecycle: pending → running → completed/failed → restored | expired
- Types: logical, schema, data, full
- Auto-expiry via `admin_expire_backup_snapshots()` (call from nightly-maintenance)

**RPCs** (all require `manage_admins`, audit-logged):
- `admin_register_backup_snapshot(label, type, scope, retention_days, notes)` → uuid
- `admin_mark_backup_restored(snapshot_id, notes)` → void
- `admin_expire_backup_snapshots()` → int (service_role only)

**UI**: `src/components/admin/BackupSnapshotsRegistry.tsx` (route `backup-snapshots`)
