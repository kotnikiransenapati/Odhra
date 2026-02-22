import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bell,
  BellRing,
  Send,
  Users,
  User,
  Store,
  ShieldCheck,
  Loader2,
  Search,
  Package,
  CreditCard,
  Truck,
  Gift,
  AlertCircle,
  MessageSquare,
  CheckCircle,
  Clock,
  Target,
  Megaphone,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const notificationTypes = [
  { value: 'order', label: 'Order Update', icon: Package, color: 'text-info' },
  { value: 'payment', label: 'Payment', icon: CreditCard, color: 'text-success' },
  { value: 'shipping', label: 'Shipping', icon: Truck, color: 'text-warning' },
  { value: 'promotion', label: 'Promotion', icon: Gift, color: 'text-accent' },
  { value: 'alert', label: 'Alert', icon: AlertCircle, color: 'text-destructive' },
  { value: 'message', label: 'Message', icon: MessageSquare, color: 'text-primary' },
  { value: 'general', label: 'General', icon: Bell, color: 'text-muted-foreground' },
];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

export function AdminNotificationManager() {
  const { sendNotification, sendBulkNotifications, isSending } = useAdminNotifications();
  const [activeTab, setActiveTab] = useState('send');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendMode, setSendMode] = useState<'single' | 'bulk' | 'segment'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Fetch user roles for segmentation
  const { data: userRoles = [] } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error) throw error;
      return data;
    },
  });

  // Fetch recent notifications
  const { data: recentNotifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['admin-recent-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSegmentUsers = (segment: string): string[] => {
    switch (segment) {
      case 'all':
        return users.map(u => u.id);
      case 'customers':
        const vendorIds = userRoles.filter(r => r.role === 'vendor').map(r => r.user_id);
        const adminIds = userRoles.filter(r => r.role === 'admin').map(r => r.user_id);
        return users.filter(u => !vendorIds.includes(u.id) && !adminIds.includes(u.id)).map(u => u.id);
      case 'vendors':
        return userRoles.filter(r => r.role === 'vendor').map(r => r.user_id);
      case 'admins':
        return userRoles.filter(r => r.role === 'admin').map(r => r.user_id);
      default:
        return [];
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please enter title and message');
      return;
    }

    try {
      if (sendMode === 'single' && selectedUsers.length === 1) {
        await sendNotification({
          userId: selectedUsers[0],
          title,
          body,
          type,
        });
      } else if (sendMode === 'bulk' && selectedUsers.length > 0) {
        await sendBulkNotifications({
          userIds: selectedUsers,
          title,
          body,
          type,
        });
      } else if (sendMode === 'segment') {
        const segmentUsers = getSegmentUsers(selectedSegment);
        if (segmentUsers.length === 0) {
          toast.error('No users in selected segment');
          return;
        }
        await sendBulkNotifications({
          userIds: segmentUsers,
          title,
          body,
          type,
        });
      }

      // Reset form
      setTitle('');
      setBody('');
      setType('general');
      setSelectedUsers([]);
      setShowSendDialog(false);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    setSelectedUsers(prev => {
      const allSelected = filteredIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !filteredIds.includes(id));
      }
      return [...new Set([...prev, ...filteredIds])];
    });
  };

  const stats = {
    totalSent: recentNotifications.length,
    todaySent: recentNotifications.filter(n => 
      new Date(n.created_at).toDateString() === new Date().toDateString()
    ).length,
    unread: recentNotifications.filter(n => !n.is_read).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BellRing className="w-6 h-6 text-primary" />
            Push Notifications
          </h2>
          <p className="text-muted-foreground">
            Send notifications to customers, vendors, or specific users
          </p>
        </div>
        <Button
          onClick={() => setShowSendDialog(true)}
          className="gap-2 bg-gradient-to-r from-primary to-accent"
        >
          <Send className="w-4 h-4" />
          Send Notification
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSent}</p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todaySent}</p>
                <p className="text-sm text-muted-foreground">Sent Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unread}</p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="send" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Quick Send
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Segment Cards */}
            <Card 
              className={`cursor-pointer transition-all hover:border-primary ${
                sendMode === 'segment' && selectedSegment === 'all' ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => {
                setSendMode('segment');
                setSelectedSegment('all');
                setShowSendDialog(true);
              }}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">All Users</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Send to everyone on the platform
                </p>
                <Badge variant="secondary">{users.length} users</Badge>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:border-primary ${
                sendMode === 'segment' && selectedSegment === 'customers' ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => {
                setSendMode('segment');
                setSelectedSegment('customers');
                setShowSendDialog(true);
              }}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-info/20 to-info/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-info" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Customers</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Target shoppers and buyers
                </p>
                <Badge variant="secondary">{getSegmentUsers('customers').length} users</Badge>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:border-primary ${
                sendMode === 'segment' && selectedSegment === 'vendors' ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => {
                setSendMode('segment');
                setSelectedSegment('vendors');
                setShowSendDialog(true);
              }}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Vendors</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Notify all sellers
                </p>
                <Badge variant="secondary">{getSegmentUsers('vendors').length} users</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setSendMode('bulk');
                setShowSendDialog(true);
              }}
              className="gap-2"
            >
              <Target className="w-4 h-4" />
              Select Specific Users
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>View all sent notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications sent yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentNotifications.map((notification) => {
                        const typeConfig = notificationTypes.find(t => t.value === notification.type);
                        const TypeIcon = typeConfig?.icon || Bell;

                        return (
                          <TableRow key={notification.id}>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <TypeIcon className={`w-3 h-3 ${typeConfig?.color}`} />
                                {typeConfig?.label || notification.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{notification.title}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                              {notification.body}
                            </TableCell>
                            <TableCell>
                              {notification.is_read ? (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Read
                                </Badge>
                              ) : (
                                <Badge className="gap-1 bg-info">
                                  <Clock className="w-3 h-3" />
                                  Unread
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Send Push Notification
            </DialogTitle>
            <DialogDescription>
              {sendMode === 'segment' && `Sending to ${selectedSegment} (${getSegmentUsers(selectedSegment).length} users)`}
              {sendMode === 'bulk' && `Select users to notify`}
              {sendMode === 'single' && `Send to a specific user`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Selection for Bulk Mode */}
            {sendMode === 'bulk' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                    {filteredUsers.every(u => selectedUsers.includes(u.id)) ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedUsers.length} selected
                  </Badge>
                </div>

                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {usersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedUsers.includes(user.id) ? 'bg-primary/10' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleUserSelection(user.id)}
                        >
                          <Checkbox checked={selectedUsers.includes(user.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {user.full_name || 'No name'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Notification Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Notification Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className={`w-4 h-4 ${t.color}`} />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Notification title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Write your notification message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !title.trim() || !body.trim() || (sendMode === 'bulk' && selectedUsers.length === 0)}
              className="gap-2 bg-gradient-to-r from-primary to-accent"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
