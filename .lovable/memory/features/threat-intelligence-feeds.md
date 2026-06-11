---
name: Threat Intelligence Feeds
description: Curated blocklist registry (IPs/domains/hashes/emails) with bulk import and runtime check_threat_indicator helper
type: feature
---
Tables: `threat_intel_feeds`, `threat_intel_indicators` (UNIQUE on feed_id+value, upsert on duplicate).
RPCs: `admin_threat_feeds_stats`, `admin_threat_feeds_list`, `admin_upsert_threat_feed`, `admin_add_threat_indicators` (bulk JSONB array, updates last_synced_at + indicator_count), `check_threat_indicator(value)` for runtime lookup.
UI: `src/components/admin/ThreatIntelFeeds.tsx` (Admin → System → Threat Intel Feeds). Stale banner when last_synced_at >7d. Permission: `manage_admins`. All mutations audit-logged.
