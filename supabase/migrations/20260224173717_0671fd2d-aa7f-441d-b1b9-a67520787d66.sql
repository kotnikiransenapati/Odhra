
-- Security definer function to validate an invite token without requiring auth
CREATE OR REPLACE FUNCTION public.validate_admin_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT ai.*, ar.display_name as role_display_name, ar.permissions as role_permissions
  INTO invite_record
  FROM admin_invites ai
  LEFT JOIN admin_roles ar ON ai.admin_role_id = ar.id
  WHERE ai.invite_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invite not found');
  END IF;

  IF invite_record.status != 'pending' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invite has already been ' || invite_record.status);
  END IF;

  IF invite_record.expires_at < now() THEN
    -- Mark as expired
    UPDATE admin_invites SET status = 'expired' WHERE invite_token = p_token;
    RETURN jsonb_build_object('valid', false, 'error', 'Invite has expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'email', invite_record.email,
    'role_name', COALESCE(invite_record.role_display_name, 'Admin'),
    'notes', invite_record.notes,
    'expires_at', invite_record.expires_at,
    'access_expires_at', invite_record.access_expires_at
  );
END;
$$;

-- Security definer function to accept an admin invite after user is authenticated
CREATE OR REPLACE FUNCTION public.accept_admin_invite(p_token text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Lock and fetch the invite
  SELECT * INTO invite_record
  FROM admin_invites
  WHERE invite_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF invite_record.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite has already been ' || invite_record.status);
  END IF;

  IF invite_record.expires_at < now() THEN
    UPDATE admin_invites SET status = 'expired' WHERE id = invite_record.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invite has expired');
  END IF;

  -- Check user email matches invite email
  DECLARE
    user_email TEXT;
  BEGIN
    SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
    IF lower(user_email) != lower(invite_record.email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'This invite was sent to a different email address. Please sign in with ' || invite_record.email);
    END IF;
  END;

  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN
    -- Update existing admin user with new role if needed
    UPDATE admin_users
    SET admin_role_id = invite_record.admin_role_id,
        custom_permissions = COALESCE(invite_record.custom_permissions, ARRAY[]::text[]),
        access_expires_at = invite_record.access_expires_at,
        is_active = true,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    -- Create new admin user
    INSERT INTO admin_users (user_id, admin_role_id, custom_permissions, access_expires_at, is_active, created_by)
    VALUES (p_user_id, invite_record.admin_role_id, COALESCE(invite_record.custom_permissions, ARRAY[]::text[]), invite_record.access_expires_at, true, invite_record.invited_by);
  END IF;

  -- Ensure user has 'admin' role in user_roles
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Mark invite as accepted
  UPDATE admin_invites
  SET status = 'accepted', accepted_at = now(), accepted_by = p_user_id
  WHERE id = invite_record.id;

  -- Log the action
  INSERT INTO admin_audit_log (admin_user_id, action, entity_type, entity_id, new_values)
  VALUES (p_user_id, 'accept_admin_invite', 'admin_invites', invite_record.id::text, 
          jsonb_build_object('email', invite_record.email, 'role_id', invite_record.admin_role_id));

  RETURN jsonb_build_object(
    'success', true,
    'role_name', (SELECT display_name FROM admin_roles WHERE id = invite_record.admin_role_id)
  );
END;
$$;
