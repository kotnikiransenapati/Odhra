import React, { useState } from 'react';
import { useAdminSupportTickets, useSupportTicket } from '@/hooks/useSupportTickets';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoAssignStaff, useStaffWorkload } from '@/hooks/useTicketAutoAssignment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffWorkloadDashboard } from './StaffWorkloadDashboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  User,
  Headphones,
  UserPlus,
  BarChart3,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// Hook to fetch admin/staff members for ticket assignment
function useStaffMembers() {
  return useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      // Get all admin users from user_roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) return [];

      const userIds = adminRoles.map((r) => r.user_id);

      // Get their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return profiles || [];
    },
  });
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  open: { color: 'bg-yellow-500', icon: Clock, label: 'Open' },
  in_progress: { color: 'bg-blue-500', icon: AlertCircle, label: 'In Progress' },
  resolved: { color: 'bg-green-500', icon: CheckCircle2, label: 'Resolved' },
  closed: { color: 'bg-gray-500', icon: XCircle, label: 'Closed' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-gray-400', label: 'Low' },
  medium: { color: 'bg-yellow-500', label: 'Medium' },
  high: { color: 'bg-orange-500', label: 'High' },
  urgent: { color: 'bg-red-500', label: 'Urgent' },
};

interface TicketDetailPanelProps {
  ticketId: string;
  onClose: () => void;
  onReply: (message: string) => Promise<void>;
  onUpdateStatus: (status: string) => Promise<void>;
  onAssign: (staffId: string | null) => Promise<void>;
  isReplying: boolean;
  isUpdating: boolean;
}

function TicketDetailPanel({
  ticketId,
  onReply,
  onUpdateStatus,
  onAssign,
  isReplying,
  isUpdating,
}: TicketDetailPanelProps) {
  const { ticket, messages, isLoading } = useSupportTicket(ticketId);
  const { data: staffMembers = [] } = useStaffMembers();
  const [replyMessage, setReplyMessage] = useState('');

  // Fetch customer profile
  const { data: customerProfile } = useQuery({
    queryKey: ['admin-ticket-customer', ticket?.user_id],
    queryFn: async () => {
      if (!ticket?.user_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', ticket.user_id)
        .single();
      return data;
    },
    enabled: !!ticket?.user_id,
  });

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;
    await onReply(replyMessage);
    setReplyMessage('');
  };

  if (isLoading || !ticket) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const config = statusConfig[ticket.status] || statusConfig.open;
  const StatusIcon = config.icon;
  const priorityCfg = priorityConfig[ticket.priority] || priorityConfig.medium;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
              <Badge className={`${config.color} text-white`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              <Badge variant="outline" className={priorityCfg.color.replace('bg-', 'border-')}>
                {priorityCfg.label}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold">{ticket.subject}</h3>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</p>
          </div>
        </div>
        
        {/* Customer info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{customerProfile?.full_name || 'Customer'}</p>
            <p className="text-sm text-muted-foreground">{customerProfile?.email}</p>
          </div>
        </div>
        
        {/* Status and Assignment */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Select
              value={ticket.status}
              onValueChange={onUpdateStatus}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Assign to:</span>
            <Select
              value={ticket.assigned_to || 'unassigned'}
              onValueChange={(v) => onAssign(v === 'unassigned' ? null : v)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select staff..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name || staff.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
      </div>
      
      {/* Original Message */}
      <div className="p-4 border-b border-border bg-muted/20">
        <p className="text-sm font-medium text-muted-foreground mb-2">Original Message:</p>
        <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span>Category: {ticket.category}</span>
          {ticket.order_id && <span>Order: {ticket.order_id}</span>}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_staff_reply ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.is_staff_reply
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.is_staff_reply ? (
                    <Headphones className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  <span className="text-xs opacity-80">
                    {msg.is_staff_reply ? 'Support Team' : 'Customer'}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className="text-xs opacity-60 mt-1">
                  {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply input */}
      {ticket.status !== 'closed' && (
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={handleSendReply}
              disabled={!replyMessage.trim() || isReplying}
            >
              {isReplying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SupportTicketManager() {
  const { user } = useAuth();
  const { tickets, isLoading, updateTicket, sendReply, isUpdating, isReplying } = useAdminSupportTickets();
  const { data: staffMembers = [] } = useStaffMembers();
  const { workload, getOptimalAssignee } = useAutoAssignStaff();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tickets');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesAssignee = 
      assigneeFilter === 'all' || 
      (assigneeFilter === 'unassigned' && !ticket.assigned_to) ||
      ticket.assigned_to === assigneeFilter;
    return matchesSearch && matchesStatus && matchesAssignee;
  });

  const stats = {
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  };

  const handleReply = async (message: string) => {
    if (!selectedTicketId || !user) return;
    await sendReply({ ticketId: selectedTicketId, message, userId: user.id });
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicketId) return;
    await updateTicket({ ticketId: selectedTicketId, updates: { status } });
  };

  const handleAssign = async (staffId: string | null) => {
    if (!selectedTicketId) return;
    await updateTicket({ ticketId: selectedTicketId, updates: { assigned_to: staffId } });
  };

  // Auto-assign unassigned urgent/high priority tickets
  const handleBulkAutoAssign = async () => {
    const unassignedUrgent = tickets.filter(
      (t) => !t.assigned_to && 
      (t.priority === 'urgent' || t.priority === 'high') && 
      (t.status === 'open' || t.status === 'in_progress')
    );

    if (unassignedUrgent.length === 0) {
      toast.info('No urgent/high priority tickets to assign');
      return;
    }

    setIsAutoAssigning(true);
    let assigned = 0;

    for (const ticket of unassignedUrgent) {
      const assignee = getOptimalAssignee(ticket.priority);
      if (assignee) {
        try {
          await updateTicket({ 
            ticketId: ticket.id, 
            updates: { assigned_to: assignee, status: 'in_progress' } 
          });
          assigned++;
        } catch (err) {
          console.error('Failed to assign ticket:', err);
        }
      }
    }

    setIsAutoAssigning(false);
    toast.success(`Auto-assigned ${assigned} ticket${assigned !== 1 ? 's' : ''}`);
  };

  // Get staff name by ID
  const getStaffName = (staffId: string | null) => {
    if (!staffId) return null;
    const staff = staffMembers.find((s) => s.id === staffId);
    return staff?.full_name || staff?.email || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.in_progress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <XCircle className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold">{stats.closed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Tickets and Workload */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="workload" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Staff Workload
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'tickets' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkAutoAssign}
              disabled={isAutoAssigning}
              className="gap-2"
            >
              {isAutoAssigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Auto-Assign Urgent
            </Button>
          )}
        </div>

        <TabsContent value="tickets" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name || staff.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tickets Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Support Tickets ({filteredTickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                  <p className="text-muted-foreground">
                    {search || statusFilter !== 'all'
                      ? 'Try different filters'
                      : 'No support tickets yet'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => {
                      const statusCfg = statusConfig[ticket.status] || statusConfig.open;
                      const StatusIcon = statusCfg.icon;
                      const priorityCfg = priorityConfig[ticket.priority] || priorityConfig.medium;

                      return (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            <span className="font-mono text-sm">{ticket.ticket_number}</span>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium truncate max-w-[200px]">{ticket.subject}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {ticket.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${priorityCfg.color} text-white`}>
                              {priorityCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusCfg.color} text-white`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ticket.assigned_to ? (
                              <div className="flex items-center gap-1">
                                <Headphones className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{getStaffName(ticket.assigned_to)}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Unassigned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTicketId(ticket.id)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workload">
          <StaffWorkloadDashboard onAssignTickets={handleBulkAutoAssign} />
        </TabsContent>
      </Tabs>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicketId} onOpenChange={() => setSelectedTicketId(null)}>
        <DialogContent className="max-w-2xl p-0 max-h-[90vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicketId && (
            <TicketDetailPanel
              ticketId={selectedTicketId}
              onClose={() => setSelectedTicketId(null)}
              onReply={handleReply}
              onUpdateStatus={handleUpdateStatus}
              onAssign={handleAssign}
              isReplying={isReplying}
              isUpdating={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
