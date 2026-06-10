
-- ============= Batch 21: Maintenance Windows =============
CREATE TABLE IF NOT EXISTS public.maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',              -- 'global' or service_name
  reason text NOT NULL,
  allow_admins boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,                                -- null = open-ended
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_scope_time
  ON public.maintenance_windows (scope, starts_at DESC);

GRANT SELECT ON public.maintenance_windows TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.maintenance_windows TO authenticated;
GRANT ALL ON public.maintenance_windows TO service_role;

ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active maintenance"
ON public.maintenance_windows FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage maintenance"
ON public.maintenance_windows FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Public-callable: edge functions / client gate via this
CREATE OR REPLACE FUNCTION public.is_maintenance_active(_service text DEFAULT 'global')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.maintenance_windows
    WHERE starts_at <= now()
      AND (ends_at IS NULL OR ends_at > now())
      AND (scope = 'global' OR scope = _service)
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_maintenance_active(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_start_maintenance(
  _scope text, _reason text, _allow_admins boolean DEFAULT true, _ends_at timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.maintenance_windows(scope, reason, allow_admins, ends_at, created_by)
  VALUES (_scope, _reason, _allow_admins, _ends_at, auth.uid())
  RETURNING id INTO _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'maintenance.start', 'maintenance_window', _id::text,
          jsonb_build_object('scope',_scope,'reason',_reason,'ends_at',_ends_at));
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_start_maintenance(text,text,boolean,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_end_maintenance(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.maintenance_windows SET ends_at = now(), updated_at = now() WHERE id = _id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'maintenance.end', 'maintenance_window', _id::text);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_end_maintenance(uuid) TO authenticated;

-- ============= Batch 22: Managed Secrets =============
CREATE TABLE IF NOT EXISTS public.managed_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('payment','shipping','email','sms','auth','ai','analytics','storage','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  rotation_interval_days integer NOT NULL DEFAULT 90,
  last_rotated_at timestamptz,
  rotation_count integer NOT NULL DEFAULT 0,
  owner_email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.managed_secrets TO authenticated;
GRANT ALL ON public.managed_secrets TO service_role;

ALTER TABLE public.managed_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage secrets registry"
ON public.managed_secrets FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.admin_secrets_status()
RETURNS TABLE(
  id uuid, name text, category text, severity text,
  rotation_interval_days integer, last_rotated_at timestamptz,
  rotation_count integer, owner_email text, notes text,
  days_since_rotated integer, days_until_due integer, status text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT s.id, s.name, s.category, s.severity, s.rotation_interval_days,
         s.last_rotated_at, s.rotation_count, s.owner_email, s.notes,
         CASE WHEN s.last_rotated_at IS NULL THEN NULL
              ELSE EXTRACT(DAY FROM now() - s.last_rotated_at)::integer END,
         CASE WHEN s.last_rotated_at IS NULL THEN NULL
              ELSE s.rotation_interval_days - EXTRACT(DAY FROM now() - s.last_rotated_at)::integer END,
         CASE
           WHEN s.last_rotated_at IS NULL THEN 'never_rotated'
           WHEN now() - s.last_rotated_at > make_interval(days => s.rotation_interval_days) THEN 'overdue'
           WHEN now() - s.last_rotated_at > make_interval(days => GREATEST(s.rotation_interval_days - 14, 0)) THEN 'due_soon'
           ELSE 'ok'
         END
  FROM public.managed_secrets s
  WHERE s.is_active = true
  ORDER BY
    CASE WHEN s.last_rotated_at IS NULL THEN 0
         WHEN now() - s.last_rotated_at > make_interval(days => s.rotation_interval_days) THEN 1
         ELSE 2 END,
    s.severity DESC, s.name;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_secrets_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_secret_rotated(_name text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.managed_secrets
    SET last_rotated_at = now(),
        rotation_count = rotation_count + 1,
        notes = COALESCE(_note, notes),
        updated_at = now()
  WHERE name = _name;
  IF NOT FOUND THEN RAISE EXCEPTION 'secret % not found', _name; END IF;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(),'secret.rotated','managed_secret', _name,
          jsonb_build_object('note', _note));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_mark_secret_rotated(text,text) TO authenticated;

-- Seed the known critical secrets (idempotent)
INSERT INTO public.managed_secrets(name, category, severity, rotation_interval_days, owner_email, notes)
VALUES
 ('RAZORPAY_KEY_SECRET','payment','critical',180,NULL,'Razorpay live secret key'),
 ('RAZORPAY_WEBHOOK_SECRET','payment','critical',180,NULL,'Razorpay webhook signature'),
 ('DELHIVERY_API_TOKEN','shipping','high',365,NULL,'Delhivery API token'),
 ('INDIAPOST_API_KEY','shipping','high',365,NULL,'India Post tracking API'),
 ('RESEND_API_KEY','email','high',180,NULL,'Resend transactional email API'),
 ('LOVABLE_API_KEY','ai','high',180,NULL,'Lovable AI Gateway key'),
 ('GOOGLE_OAUTH_CLIENT_SECRET','auth','critical',365,NULL,'Google sign-in client secret'),
 ('ALGOLIA_ADMIN_KEY','analytics','high',180,NULL,'Algolia admin key (server-side)'),
 ('VAPID_PRIVATE_KEY','other','medium',730,NULL,'Web Push VAPID private key'),
 ('RECAPTCHA_SECRET_KEY','auth','high',365,NULL,'Google reCAPTCHA v3 secret')
ON CONFLICT (name) DO NOTHING;
