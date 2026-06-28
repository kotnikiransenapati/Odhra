
-- =========================================================
-- Batch S1 + S2: Wholesale Security Hardening
-- =========================================================

-- 1) Wholesale TOTP 2FA enrollments
CREATE TABLE IF NOT EXISTS public.wholesale_2fa_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  wholesaler_id UUID NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  recovery_codes_hash JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
  last_verified_at TIMESTAMPTZ,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_2fa_enrollments TO authenticated;
GRANT ALL ON public.wholesale_2fa_enrollments TO service_role;
ALTER TABLE public.wholesale_2fa_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wsh 2fa: owner manages"
  ON public.wholesale_2fa_enrollments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wsh 2fa: admin reads"
  ON public.wholesale_2fa_enrollments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Trusted devices (per wholesaler user)
CREATE TABLE IF NOT EXISTS public.wholesale_trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wholesaler_id UUID NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_label TEXT,
  user_agent TEXT,
  ip_address INET,
  ip_country TEXT,
  trusted BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_trusted_devices TO authenticated;
GRANT ALL ON public.wholesale_trusted_devices TO service_role;
ALTER TABLE public.wholesale_trusted_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wsh devices: owner"
  ON public.wholesale_trusted_devices FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wsh devices: admin reads"
  ON public.wholesale_trusted_devices FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) IP allowlist per wholesaler account
CREATE TABLE IF NOT EXISTS public.wholesale_ip_allowlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wholesaler_id UUID NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  cidr CIDR NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wholesaler_id, cidr)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_ip_allowlist TO authenticated;
GRANT ALL ON public.wholesale_ip_allowlist TO service_role;
ALTER TABLE public.wholesale_ip_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wsh ip: owner manages"
  ON public.wholesale_ip_allowlist FOR ALL
  USING (EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id = wholesaler_id AND wa.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id = wholesaler_id AND wa.user_id = auth.uid()));
CREATE POLICY "wsh ip: admin all"
  ON public.wholesale_ip_allowlist FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Sensitive-action audit log (billing / bank / credit / large orders)
CREATE TABLE IF NOT EXISTS public.wholesale_security_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wholesaler_id UUID REFERENCES public.wholesaler_accounts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,           -- e.g. 'bank_update','credit_limit_change','large_order_place','2fa_enable','2fa_disable','device_revoke','ip_allowlist_change'
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  step_up_verified BOOLEAN NOT NULL DEFAULT false,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wholesale_security_audit TO authenticated;
GRANT ALL ON public.wholesale_security_audit TO service_role;
ALTER TABLE public.wholesale_security_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wsh audit: owner reads"
  ON public.wholesale_security_audit FOR SELECT
  USING (auth.uid() = user_id OR
         EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id = wholesaler_id AND wa.user_id = auth.uid()));
CREATE POLICY "wsh audit: admin reads"
  ON public.wholesale_security_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wsh audit: authenticated insert (own)"
  ON public.wholesale_security_audit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wsh_audit_wholesaler_time
  ON public.wholesale_security_audit (wholesaler_id, created_at DESC);

-- 5) Step-up auth challenges (short-lived OTP for sensitive ops)
CREATE TABLE IF NOT EXISTS public.wholesale_stepup_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wholesaler_id UUID NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  attempts INT NOT NULL DEFAULT 0,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wholesale_stepup_challenges TO authenticated;
GRANT ALL ON public.wholesale_stepup_challenges TO service_role;
ALTER TABLE public.wholesale_stepup_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wsh stepup: owner"
  ON public.wholesale_stepup_challenges FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6) 2FA policy: helper to check whether wholesaler has active 2FA
CREATE OR REPLACE FUNCTION public.wholesale_has_active_2fa(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wholesale_2fa_enrollments
    WHERE user_id = _user_id AND status = 'active'
  );
$$;

-- 7) Helper: log sensitive action
CREATE OR REPLACE FUNCTION public.log_wholesale_security_event(
  _wholesaler_id UUID,
  _action TEXT,
  _severity TEXT,
  _resource_type TEXT,
  _resource_id TEXT,
  _before JSONB,
  _after JSONB,
  _metadata JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.wholesale_security_audit
    (wholesaler_id, user_id, action, severity, resource_type, resource_id, before_state, after_state, metadata)
  VALUES
    (_wholesaler_id, auth.uid(), _action, COALESCE(_severity,'info'), _resource_type, _resource_id,
     _before, _after, COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_wholesale_security_event(UUID,TEXT,TEXT,TEXT,TEXT,JSONB,JSONB,JSONB) TO authenticated;

-- 8) Trigger to audit credit limit changes on wholesaler_accounts
CREATE OR REPLACE FUNCTION public.tg_audit_wholesaler_credit_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.credit_limit IS DISTINCT FROM OLD.credit_limit THEN
    INSERT INTO public.wholesale_security_audit
      (wholesaler_id, user_id, action, severity, resource_type, resource_id, before_state, after_state)
    VALUES
      (NEW.id, auth.uid(), 'credit_limit_change', 'warning', 'wholesaler_account', NEW.id::text,
       jsonb_build_object('credit_limit', OLD.credit_limit),
       jsonb_build_object('credit_limit', NEW.credit_limit));
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.wholesale_security_audit
      (wholesaler_id, user_id, action, severity, resource_type, resource_id, before_state, after_state)
    VALUES
      (NEW.id, auth.uid(), 'account_status_change', 'warning', 'wholesaler_account', NEW.id::text,
       jsonb_build_object('status', OLD.status),
       jsonb_build_object('status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_wholesaler_changes ON public.wholesaler_accounts;
CREATE TRIGGER audit_wholesaler_changes
AFTER UPDATE ON public.wholesaler_accounts
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_wholesaler_credit_change();

-- 9) updated_at trigger for 2fa
CREATE TRIGGER trg_wsh_2fa_updated
BEFORE UPDATE ON public.wholesale_2fa_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
