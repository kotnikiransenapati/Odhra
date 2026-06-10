ALTER TABLE public.anomaly_alert_rules DROP CONSTRAINT IF EXISTS anomaly_alert_rules_created_by_fkey;
ALTER TABLE public.anomaly_alerts DROP CONSTRAINT IF EXISTS anomaly_alerts_acknowledged_by_fkey;
ALTER TABLE public.release_notes DROP CONSTRAINT IF EXISTS release_notes_created_by_fkey;
ALTER TABLE public.release_notes DROP CONSTRAINT IF EXISTS release_notes_updated_by_fkey;