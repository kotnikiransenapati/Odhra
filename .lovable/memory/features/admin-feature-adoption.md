---
name: Admin Feature Adoption
description: Per-admin usage counters for admin tools with leaderboard and intensity bars
type: feature
---
Table: `admin_feature_adoption` (UNIQUE admin_id+feature_key, usage_count, first/last_used_at).
RPCs: `record_admin_feature_usage(_feature_key)` (called client-side on feature mount), `admin_feature_adoption_stats(_days)`, `admin_feature_adoption_leaderboard(_days)`.
UI: `src/components/admin/FeatureAdoptionDashboard.tsx` (Admin → System → Feature Adoption). Permission to view aggregates: `view_audit_log`. Any admin can record own usage.
