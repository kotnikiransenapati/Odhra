CREATE TABLE IF NOT EXISTS public.runbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  trigger_kind text NOT NULL CHECK (trigger_kind IN ('manual','sla_breach','probe_fail','dlq_depth','circuit_open','error_spike','anomaly','webhook')),
  trigger_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('info','minor','major','critical')),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_role text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runbooks TO authenticated;
GRANT ALL ON public.runbooks TO service_role;
ALTER TABLE public.runbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage runbooks" ON public.runbooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.runbook_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runbook_id uuid NOT NULL REFERENCES public.runbooks(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  triggered_by uuid,
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed','partial','cancelled')),
  step_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runbook_executions TO authenticated;
GRANT ALL ON public.runbook_executions TO service_role;
ALTER TABLE public.runbook_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage runbook executions" ON public.runbook_executions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_runbook_exec_incident ON public.runbook_executions(incident_id);

CREATE TRIGGER trg_runbooks_updated BEFORE UPDATE ON public.runbooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();