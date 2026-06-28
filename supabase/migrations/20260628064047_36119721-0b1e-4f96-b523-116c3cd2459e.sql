
-- 1) Extend role enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'wholesaler'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'wholesaler';
  END IF;
END$$;

-- 2) wholesaler_accounts
CREATE TABLE IF NOT EXISTS public.wholesaler_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  legal_name text,
  gstin text,
  pan text,
  business_type text,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text NOT NULL,
  billing_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  shipping_addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected','suspended')),
  rejection_reason text,
  tier text NOT NULL DEFAULT 'standard',
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  credit_used numeric(12,2) NOT NULL DEFAULT 0,
  payment_terms_days integer NOT NULL DEFAULT 0,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.wholesaler_accounts TO authenticated;
GRANT ALL ON public.wholesaler_accounts TO service_role;
ALTER TABLE public.wholesaler_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_select_own_or_admin" ON public.wholesaler_accounts
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "wa_insert_self" ON public.wholesaler_accounts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wa_update_own_pending_or_admin" ON public.wholesaler_accounts
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (auth.uid() = user_id AND status IN ('pending','under_review'))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR (
    auth.uid() = user_id
    AND status IN ('pending','under_review')
    -- non-admins cannot escalate sensitive fields
    AND credit_limit = (SELECT credit_limit FROM public.wholesaler_accounts w WHERE w.id = wholesaler_accounts.id)
    AND tier        = (SELECT tier        FROM public.wholesaler_accounts w WHERE w.id = wholesaler_accounts.id)
    AND status      = (SELECT status      FROM public.wholesaler_accounts w WHERE w.id = wholesaler_accounts.id)
  )
);

CREATE POLICY "wa_delete_admin" ON public.wholesaler_accounts
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_wa_status ON public.wholesaler_accounts(status);
CREATE INDEX IF NOT EXISTS idx_wa_tier   ON public.wholesaler_accounts(tier);

-- 3) wholesaler_documents
CREATE TABLE IF NOT EXISTS public.wholesaler_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('gst_certificate','pan_card','trade_license','cancelled_cheque','address_proof','other')),
  file_url text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes integer,
  verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesaler_documents TO authenticated;
GRANT ALL ON public.wholesaler_documents TO service_role;
ALTER TABLE public.wholesaler_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wd_select_own_or_admin" ON public.wholesaler_documents
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "wd_insert_own" ON public.wholesaler_documents
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wd_update_admin" ON public.wholesaler_documents
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "wd_delete_own_pending_or_admin" ON public.wholesaler_documents
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.wholesaler_accounts a
      WHERE a.id = wholesaler_documents.account_id
        AND a.status IN ('pending','under_review')
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_wd_account ON public.wholesaler_documents(account_id);

-- 4) wholesaler_application_events (audit log)
CREATE TABLE IF NOT EXISTS public.wholesaler_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.wholesaler_application_events TO authenticated;
GRANT ALL ON public.wholesaler_application_events TO service_role;
ALTER TABLE public.wholesaler_application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wae_select_own_or_admin" ON public.wholesaler_application_events
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.wholesaler_accounts a
    WHERE a.id = wholesaler_application_events.account_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "wae_insert_admin_or_system" ON public.wholesaler_application_events
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_wae_account ON public.wholesaler_application_events(account_id);

-- 5) updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_wholesaler_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;

DROP TRIGGER IF EXISTS trg_wa_updated_at ON public.wholesaler_accounts;
CREATE TRIGGER trg_wa_updated_at BEFORE UPDATE ON public.wholesaler_accounts
FOR EACH ROW EXECUTE FUNCTION public.tg_wholesaler_set_updated_at();

DROP TRIGGER IF EXISTS trg_wd_updated_at ON public.wholesaler_documents;
CREATE TRIGGER trg_wd_updated_at BEFORE UPDATE ON public.wholesaler_documents
FOR EACH ROW EXECUTE FUNCTION public.tg_wholesaler_set_updated_at();

-- 6) Auto-log status transitions and auto-grant wholesaler role on approval
CREATE OR REPLACE FUNCTION public.tg_wholesaler_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.wholesaler_application_events(account_id, actor_id, event_type, to_status, payload)
    VALUES (NEW.id, NEW.user_id, 'application_submitted', NEW.status, jsonb_build_object('business_name', NEW.business_name));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.wholesaler_application_events(account_id, actor_id, event_type, from_status, to_status, payload)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status, '{}'::jsonb);

    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
      INSERT INTO public.user_roles(user_id, role)
      VALUES (NEW.user_id, 'wholesaler')
      ON CONFLICT (user_id, role) DO NOTHING;

      IF NEW.approved_at IS NULL THEN NEW.approved_at := now(); END IF;
    END IF;

    IF NEW.status IN ('suspended','rejected') AND OLD.status = 'approved' THEN
      DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'wholesaler';
    END IF;
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_wa_status_change ON public.wholesaler_accounts;
CREATE TRIGGER trg_wa_status_change
BEFORE INSERT OR UPDATE ON public.wholesaler_accounts
FOR EACH ROW EXECUTE FUNCTION public.tg_wholesaler_status_change();

-- 7) Helper: is current user an approved wholesaler?
CREATE OR REPLACE FUNCTION public.current_user_is_approved_wholesaler()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wholesaler_accounts
    WHERE user_id = auth.uid() AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_approved_wholesaler() TO authenticated;
