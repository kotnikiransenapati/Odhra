---
name: Storage Usage Analyzer
description: Admin RPC admin_storage_usage + StorageUsageAnalyzer UI showing per-bucket counts, totals, avg/largest object size, last upload
type: feature
---
- `public.admin_storage_usage()` SECURITY DEFINER, admin-gated, joins storage.buckets to LATERAL aggregate on storage.objects
- Returns: object_count, total_bytes, avg_bytes, largest_bytes, last_uploaded_at, is_public flag
- UI: Admin → System → Storage Usage; progress bar shows each bucket's share of total
