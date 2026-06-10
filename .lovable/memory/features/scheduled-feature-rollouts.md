---
name: Scheduled Feature Rollouts
description: feature_flag_rollouts scheduling with percentage/audience targeting, safety metadata, processing RPC, and admin UI
type: feature
---
- Table `feature_flag_rollouts` tracks feature_flag_id, rollout_name, target_state, audience, rollout_percentage, status, scheduled_at, safety_threshold, metrics_snapshot, rollback_reason, and notes.
- RPCs: `admin_schedule_feature_rollout`, `admin_process_due_feature_rollouts`, and `admin_cancel_feature_rollout`; all are SECURITY DEFINER, revoked from PUBLIC, and permission-gated by `manage_feature_flags`.
- Processing applies due rollouts to `feature_flags`, stores rollout metadata inside feature settings, and audit-logs completion/cancellation.
- Nightly maintenance calls `admin_process_due_feature_rollouts` after anomaly detection.
- Admin UI: `ScheduledFeatureRollouts.tsx`, tab id `scheduled-rollouts`, permission `manage_feature_flags`.