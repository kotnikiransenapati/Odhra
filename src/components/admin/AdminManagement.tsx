import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Clock, 
  Mail,
  MoreVertical,
  Check,
  X,
  Search,
  AlertTriangle,
  Crown,
  Eye,
  Trash2,
  Edit,
  History,
  Loader2,
  Calendar,
  Key
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAdminUsers,
  useAdminRoles,
  useAdminInvites,
  usePermissionDefinitions,
  useCreateAdminInvite,
  useRevokeAdminInvite,
  useUpdateAdminUser,
  useRemoveAdminUser,
  useAuditLog,
  AdminUser,
  AdminRole,
} from '@/hooks/useAdminPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

function InviteAdminDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  
  const { data: roles = [] } = useAdminRoles();
  const createInvite = useCreateAdminInvite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createInvite.mutateAsync({
        email,
        admin_role_id: roleId || undefined,
        access_expires_at: expiresAt || undefined,
        notes: notes || undefined,
      });
      toast.success('Admin invite sent');
      setOpen(false);
      setEmail('');
      setRoleId('');
      setExpiresAt('');
      setNotes('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invite');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Admin</DialogTitle>
          <DialogDescription>
            Send an invitation to add a new administrator to your team
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Admin Role *</Label>
            <select
              id="role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select a role</option>
              {roles.length === 0 && (
                <option value="" disabled>Loading roles...</option>
              )}
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.display_name} {role.description ? `— ${role.description}` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expires">Access Expires (Optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for permanent access
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any internal notes about this admin..."
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvite.isPending}>
              {createInvite.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminUserCard({ admin, roles }: { admin: AdminUser; roles: AdminRole[] }) {
  const { user } = useAuth();
  const updateAdmin = useUpdateAdminUser();
  const removeAdmin = useRemoveAdminUser();
  const [showEdit, setShowEdit] = useState(false);
  const [newRoleId, setNewRoleId] = useState(admin.admin_role_id || '');
  const [newExpiresAt, setNewExpiresAt] = useState(admin.access_expires_at || '');

  const isCurrentUser = user?.id === admin.user_id;
  const role = admin.admin_role;

  const handleToggleActive = async () => {
    try {
      await updateAdmin.mutateAsync({
        id: admin.id,
        updates: { is_active: !admin.is_active },
      });
      toast.success(admin.is_active ? 'Admin deactivated' : 'Admin activated');
    } catch (error) {
      toast.error('Failed to update admin');
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this admin?')) return;
    
    try {
      await removeAdmin.mutateAsync(admin.id);
      toast.success('Admin removed');
    } catch (error) {
      toast.error('Failed to remove admin');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateAdmin.mutateAsync({
        id: admin.id,
        updates: {
          admin_role_id: newRoleId,
          access_expires_at: newExpiresAt || undefined,
        },
      });
      toast.success('Admin updated');
      setShowEdit(false);
    } catch (error) {
      toast.error('Failed to update admin');
    }
  };

  return (
    <Card className={!admin.is_active ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {admin.profile?.full_name?.[0] || admin.profile?.email?.[0]?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">
                {admin.profile?.full_name || admin.profile?.email || 'Unknown'}
              </h4>
              {admin.is_owner && (
                <Badge className="gap-1 bg-warning/10 text-warning border-warning/20">
                  <Crown className="w-3 h-3" />
                  Owner
                </Badge>
              )}
              {!admin.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {isCurrentUser && (
                <Badge variant="outline">You</Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground truncate">
              {admin.profile?.email}
            </p>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {role && (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="w-3 h-3" />
                  {role.display_name}
                </Badge>
              )}
              
              {admin.access_expires_at && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  Expires {format(new Date(admin.access_expires_at), 'MMM d, yyyy')}
                </Badge>
              )}
            </div>
          </div>

          {!isCurrentUser && !admin.is_owner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEdit(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Role
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleActive}>
                  {admin.is_active ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Admin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
              <DialogDescription>
                Update role and access settings for {admin.profile?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRoleId} onValueChange={setNewRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Access Expires</Label>
                <Input
                  type="datetime-local"
                  value={newExpiresAt ? newExpiresAt.slice(0, 16) : ''}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateAdmin.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function PendingInvitesTab() {
  const { data: invites = [], isLoading } = useAdminInvites();
  const { data: roles = [] } = useAdminRoles();
  const revokeInvite = useRevokeAdminInvite();

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvite.mutateAsync(id);
      toast.success('Invite revoked');
    } catch (error) {
      toast.error('Failed to revoke invite');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No pending invites</h3>
          <p className="text-sm text-muted-foreground">
            All invitations have been accepted or expired
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => {
        const role = roles.find((r) => r.id === invite.admin_role_id);
        return (
          <Card key={invite.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{invite.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {role && (
                      <Badge variant="secondary">{role.display_name}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(invite.id)}
                  className="text-destructive"
                >
                  <X className="w-4 h-4 mr-1" />
                  Revoke
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AuditLogTab() {
  const { data: logs = [], isLoading } = useAuditLog(50);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <History className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {log.profile?.full_name || log.profile?.email || 'System'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {log.entity_type && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.entity_type}: {log.entity_id?.slice(0, 8)}...
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

function RolesTab() {
  const { data: roles = [], isLoading } = useAdminRoles();
  const { data: permissions = [] } = usePermissionDefinitions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {role.display_name}
                  {role.is_system_role && (
                    <Badge variant="outline" className="text-xs">System</Badge>
                  )}
                </CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </div>
              <Badge variant="secondary">
                {role.permissions.length} permissions
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {role.permissions.slice(0, 8).map((perm) => (
                <Badge key={perm} variant="outline" className="text-xs">
                  {perm.replace(/_/g, ' ')}
                </Badge>
              ))}
              {role.permissions.length > 8 && (
                <Badge variant="secondary" className="text-xs">
                  +{role.permissions.length - 8} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminManagement() {
  const { data: admins = [], isLoading: adminsLoading } = useAdminUsers();
  const { data: roles = [], isLoading: rolesLoading } = useAdminRoles();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAdmins = admins.filter(admin => 
    admin.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAdmins = filteredAdmins.filter(a => a.is_active);
  const inactiveAdmins = filteredAdmins.filter(a => !a.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Admin Management</h2>
          <p className="text-muted-foreground">
            Manage administrator access and permissions
          </p>
        </div>
        <InviteAdminDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{admins.length}</p>
            <p className="text-sm text-muted-foreground">Total Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Check className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{activeAdmins.length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold">{roles.length}</p>
            <p className="text-sm text-muted-foreground">Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Crown className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">{admins.filter(a => a.is_owner).length}</p>
            <p className="text-sm text-muted-foreground">Owners</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admins" className="gap-2">
            <Users className="w-4 h-4" />
            Administrators
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2">
            <Mail className="w-4 h-4" />
            Pending Invites
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="w-4 h-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search admins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {adminsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAdmins.map((admin) => (
                <AdminUserCard key={admin.id} admin={admin} roles={roles} />
              ))}
              {filteredAdmins.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No admins found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Try a different search term' : 'Invite your first admin to get started'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites">
          <PendingInvitesTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
