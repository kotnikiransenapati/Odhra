-- Fix entity_id column type: change from uuid to text to match trigger usage
ALTER TABLE public.audit_logs ALTER COLUMN entity_id TYPE text USING entity_id::text;
