import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminRole {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
  permissions: string[];
  is_system_role: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  admin_role_id: string | null;
  custom_permissions: string[];
  is_owner: boolean;
  is_active: boolean;
  access_starts_at: string | null;
  access_expires_at: string | null;
  last_active_at: string | null;
  ip_whitelist: string[] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  admin_role?: AdminRole;
  profile?: { email: string; full_name: string | null };
}

export interface AdminInvite {
  id: string;
  email: string;
  admin_role_id: string | null;
  custom_permissions: string[];
  access_expires_at: string | null;
  invite_token: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  notes: string | null;
  created_at: string;
  admin_role?: AdminRole;
}

export interface PermissionDefinition {
  id: string;
  permission_key: string;
  permission_name: string;
  description: string | null;
  category: string;
  is_sensitive: boolean;
}

export interface AuditLogEntry {
  id: string;
  admin_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profile?: { email: string; full_name: string | null };
}

// Fetch current user's permissions
export function useMyAdminPermissions() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['my-admin-permissions', user?.id],
    queryFn: async () => {
      if (!user || !isAdmin) return [];
      
      const { data, error } = await supabase.rpc('get_admin_permissions', {
        _user_id: user.id,
      });

      if (error) throw error;
      return (data as string[]) || [];
    },
    enabled: !!user && isAdmin,
  });
}

// Check if current user has a specific permission
export function useHasPermission(permission: string) {
  const { data: permissions = [], isLoading } = useMyAdminPermissions();
  return {
    hasPermission: permissions.includes(permission),
    isLoading,
  };
}

// Fetch permission definitions
export function usePermissionDefinitions() {
  return useQuery({
    queryKey: ['permission-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_permission_definitions')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data as PermissionDefinition[];
    },
  });
}

// Fetch admin roles
export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('role_name', { ascending: true });

      if (error) throw error;
      return data as AdminRole[];
    },
  });
}

// Fetch all admin users
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: adminUsers, error } = await supabase
        .from('admin_users')
        .select(`
          *,
          admin_role:admin_roles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = adminUsers?.map(a => a.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      // Merge profiles
      const result = adminUsers?.map(admin => ({
        ...admin,
        profile: profiles?.find(p => p.id === admin.user_id) || null,
      }));

      return result as AdminUser[];
    },
  });
}

// Fetch admin invites
export function useAdminInvites() {
  return useQuery({
    queryKey: ['admin-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_invites')
        .select(`
          *,
          admin_role:admin_roles(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminInvite[];
    },
  });
}

// Create admin invite
export function useCreateAdminInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      admin_role_id,
      custom_permissions = [],
      access_expires_at,
      notes,
    }: {
      email: string;
      admin_role_id?: string;
      custom_permissions?: string[];
      access_expires_at?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('admin_invites')
        .insert({
          email,
          admin_role_id,
          custom_permissions,
          access_expires_at,
          notes,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log action
      await supabase.rpc('log_admin_action', {
        _action: 'create_admin_invite',
        _entity_type: 'admin_invites',
        _entity_id: data.id,
        _new_values: { email, admin_role_id },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
    },
  });
}

// Revoke admin invite
export function useRevokeAdminInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('admin_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        _action: 'revoke_admin_invite',
        _entity_type: 'admin_invites',
        _entity_id: inviteId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
    },
  });
}

// Update admin user
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        admin_role_id: string;
        custom_permissions: string[];
        is_active: boolean;
        access_starts_at: string;
        access_expires_at: string;
        notes: string;
      }>;
    }) => {
      const { error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        _action: 'update_admin_user',
        _entity_type: 'admin_users',
        _entity_id: id,
        _new_values: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

// Remove admin user
export function useRemoveAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch user_id BEFORE deleting the admin record
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove admin role from user_roles
      if (adminUser) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', adminUser.user_id)
          .eq('role', 'admin');
      }

      await supabase.rpc('log_admin_action', {
        _action: 'remove_admin_user',
        _entity_type: 'admin_users',
        _entity_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

// Fetch audit log
export function useAuditLog(limit = 100) {
  return useQuery({
    queryKey: ['audit-log', limit],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch profiles for admin users
      const userIds = logs?.map(l => l.admin_user_id).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      // Merge profiles
      const result = logs?.map(log => ({
        ...log,
        profile: profiles?.find(p => p.id === log.admin_user_id) || null,
      }));

      return result as AuditLogEntry[];
    },
  });
}

// Create custom admin role
export function useCreateAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role_name,
      display_name,
      description,
      permissions,
    }: {
      role_name: string;
      display_name: string;
      description?: string;
      permissions: string[];
    }) => {
      const { data, error } = await supabase
        .from('admin_roles')
        .insert({
          role_name,
          display_name,
          description,
          permissions,
          is_system_role: false,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        _action: 'create_admin_role',
        _entity_type: 'admin_roles',
        _entity_id: data.id,
        _new_values: { role_name, permissions },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
    },
  });
}
