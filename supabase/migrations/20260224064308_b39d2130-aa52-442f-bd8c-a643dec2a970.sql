
-- Fix infinite recursion on admin_users table

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Owners can manage admin users" ON public.admin_users;

-- Create a security definer function to check admin_users without recursion
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user_id AND is_active = true
  );
$$;

-- Recreate policies using the non-recursive function
CREATE POLICY "Admins can view admin users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins with permission can manage admin users"
  ON public.admin_users FOR ALL
  TO authenticated
  USING (public.can_manage_admins(auth.uid()))
  WITH CHECK (public.can_manage_admins(auth.uid()));

-- Also fix the admin_roles manage policy which has same recursion
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.admin_roles;

CREATE POLICY "Admins with permission can manage roles"
  ON public.admin_roles FOR ALL
  TO authenticated
  USING (public.can_manage_admins(auth.uid()))
  WITH CHECK (public.can_manage_admins(auth.uid()));
