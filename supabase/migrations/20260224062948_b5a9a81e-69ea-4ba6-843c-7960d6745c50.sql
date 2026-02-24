-- Fix admin invite creation failures by using non-recursive permission checks
-- and explicit INSERT policy checks

CREATE OR REPLACE FUNCTION public.can_manage_admins(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      LEFT JOIN public.admin_roles ar ON ar.id = au.admin_role_id
      WHERE au.user_id = _user_id
        AND au.is_active = true
        AND (au.access_starts_at IS NULL OR au.access_starts_at <= now())
        AND (au.access_expires_at IS NULL OR au.access_expires_at > now())
        AND (
          au.is_owner = true
          OR 'manage_admins' = ANY(COALESCE(ar.permissions, ARRAY[]::text[]))
          OR 'manage_admins' = ANY(COALESCE(au.custom_permissions, ARRAY[]::text[]))
        )
    )
    OR public.is_admin(_user_id)
  );
$$;

DROP POLICY IF EXISTS "Admins with permission can view invites" ON public.admin_invites;
DROP POLICY IF EXISTS "Admins with permission can manage invites" ON public.admin_invites;

CREATE POLICY "Admins can view invites"
  ON public.admin_invites
  FOR SELECT
  TO authenticated
  USING (public.can_manage_admins(auth.uid()));

CREATE POLICY "Admins can create invites"
  ON public.admin_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_admins(auth.uid())
    AND invited_by = auth.uid()
  );

CREATE POLICY "Admins can update invites"
  ON public.admin_invites
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_admins(auth.uid()))
  WITH CHECK (public.can_manage_admins(auth.uid()));

CREATE POLICY "Admins can delete invites"
  ON public.admin_invites
  FOR DELETE
  TO authenticated
  USING (public.can_manage_admins(auth.uid()));