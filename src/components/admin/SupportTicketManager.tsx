import React, { useState, useEffect } from 'react';
import { useAdminSupportTickets, useSupportTicket } from '@/hooks/useSupportTickets';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoAssignStaff } from '@/hooks/useTicketAutoAssignment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffWorkloadDashboard } from './StaffWorkloadDashboard';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  RefreshCw,
  TrendingUp,
  Activity,
  Timer,
  Bell,
  Filter,
  ArrowUpDown,
  Eye,
  Star,
  ThumbsUp,
  AlertTriangle,
  Inbox,
  CheckCheck,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
  open: { color: 'text-amber-600', bgColor: 'bg-amber-500/10', icon: Clock, label: 'Open' },
  in_progress: { color: 'text-blue-600', bgColor: 'bg-blue-500/10', icon: Activity, label: 'In Progress' },
  resolved: { color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', icon: CheckCircle2, label: 'Resolved' },
  closed: { color: 'text-gray-500', bgColor: 'bg-gray-500/10', icon: XCircle, label: 'Closed' },
};

const priorityConfig: Record<string, { color: string; bgColor: string; label: string; order: number }> = {
  low: { color: 'text-gray-500', bgColor: 'bg-gray-400/20', label: 'Low', order: 4 },
  medium: { color: 'text-amber-600', bgColor: 'bg-amber-500/20', label: 'Medium', order: 3 },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-500/20', label: 'High', order: 2 },
  urgent: { color: 'text-red-600', bgColor: 'bg-red-500/20', label: 'Urgent', order: 1 },
};

const categoryIcons: Record<string, React.ElementType> = {
  general: MessageSquare,
  order: Inbox,
  product: Star,
  payment: TrendingUp,
  shipping: Timer,
  return: RefreshCw,
  other: AlertCircle,
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
  const ticketAge = differenceInHours(new Date(), new Date(ticket.created_at));
  const isOldTicket = ticketAge > 24 && (ticket.status === 'open' || ticket.status === 'in_progress');

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-background to-muted/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {ticket.ticket_number}
              </span>
              <Badge className={`${config.bgColor} ${config.color} border-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              <Badge className={`${priorityCfg.bgColor} ${priorityCfg.color} border-0`}>
                {priorityCfg.label}
              </Badge>
              {isOldTicket && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Needs Attention
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold">{ticket.subject}</h3>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</p>
            <p className="text-xs mt-0.5">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        {/* Customer info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{customerProfile?.full_name || 'Customer'}</p>
            <p className="text-sm text-muted-foreground truncate">{customerProfile?.email}</p>
          </div>
          {ticket.satisfaction_rating && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-medium">{ticket.satisfaction_rating}/5</span>
            </div>
          )}
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
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Open
                  </div>
                </SelectItem>
                <SelectItem value="in_progress">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3" /> In Progress
                  </div>
                </SelectItem>
                <SelectItem value="resolved">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" /> Resolved
                  </div>
                </SelectItem>
                <SelectItem value="closed">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3 h-3" /> Closed
                  </div>
                </SelectItem>
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
              <SelectTrigger className="w-44 h-9">
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
        <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Original Message:
        </p>
        <p className="text-sm whitespace-pre-wrap bg-background p-3 rounded-lg border">
          {ticket.description}
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <Badge variant="outline" className="capitalize">{ticket.category}</Badge>
          {ticket.order_id && (
            <span className="flex items-center gap-1">
              <Inbox className="w-3 h-3" /> Order linked
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${msg.is_staff_reply ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                    msg.is_staff_reply
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.is_staff_reply ? (
                      <Headphones className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    <span className="text-xs opacity-80 font-medium">
                      {msg.is_staff_reply ? 'Support Team' : 'Customer'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                    {msg.is_staff_reply && <CheckCheck className="w-3 h-3 ml-1" />}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reply input */}
      {ticket.status !== 'closed' && (
        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSendReply();
                }
              }}
            />
            <div className="flex flex-col gap-1">
              <Button
                onClick={handleSendReply}
                disabled={!replyMessage.trim() || isReplying}
                className="h-full min-w-[60px]"
              >
                {isReplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
              <span className="text-[10px] text-muted-foreground text-center">⌘+Enter</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SupportTicketManager() {
  const { user } = useAuth();
  const { tickets, isLoading, updateTicket, sendReply, isUpdating, isReplying, refetch } = useAdminSupportTickets();
  const { data: staffMembers = [] } = useStaffMembers();
  const { getOptimalAssignee } = useAutoAssignStaff();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tickets');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New ticket notification sound effect
  useEffect(() => {
    const channel = supabase
      .channel('new-ticket-notification')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          toast.info('New support ticket received!', {
            icon: <Bell className="w-4 h-4" />,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success('Tickets refreshed');
  };

  const filteredTickets = tickets
    .filter((ticket) => {
      const matchesSearch =
        ticket.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
        ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
        ticket.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const matchesAssignee = 
        assigneeFilter === 'all' || 
        (assigneeFilter === 'unassigned' && !ticket.assigned_to) ||
        ticket.assigned_to === assigneeFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const aPriority = priorityConfig[a.priority]?.order || 5;
        const bPriority = priorityConfig[b.priority]?.order || 5;
        if (aPriority !== bPriority) return aPriority - bPriority;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
    urgent: tickets.filter((t) => t.priority === 'urgent' && t.status !== 'closed').length,
    unassigned: tickets.filter((t) => !t.assigned_to && t.status !== 'closed').length,
  };

  const avgResponseTime = tickets.length > 0 
    ? Math.round(tickets.reduce((acc, t) => {
        if (t.resolved_at) {
          return acc + differenceInHours(new Date(t.resolved_at), new Date(t.created_at));
        }
        return acc;
      }, 0) / Math.max(tickets.filter(t => t.resolved_at).length, 1))
    : 0;

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
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Inbox className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open</p>
                  <p className="text-3xl font-bold mt-1">{stats.open}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</p>
                  <p className="text-3xl font-bold mt-1">{stats.in_progress}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Activity className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolved</p>
                  <p className="text-3xl font-bold mt-1">{stats.resolved}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Urgent</p>
                  <p className="text-3xl font-bold mt-1 text-red-600">{stats.urgent}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unassigned</p>
                  <p className="text-3xl font-bold mt-1">{stats.unassigned}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10">
                  <UserPlus className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Response</p>
                  <p className="text-3xl font-bold mt-1">{avgResponseTime}h</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Timer className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
            </CardContent>
          </Card>
        </div>

        {/* Resolution Progress */}
        {stats.total > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Resolution Rate</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(((stats.resolved + stats.closed) / stats.total) * 100)}%
                </span>
              </div>
              <Progress 
                value={((stats.resolved + stats.closed) / stats.total) * 100} 
                className="h-2"
              />
            </CardContent>
          </Card>
        )}

        {/* Tabs for Tickets and Workload */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="tickets" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Tickets
                {stats.open > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {stats.open}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="workload" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Staff Workload
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'tickets' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh tickets</TooltipContent>
                </Tooltip>
                
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
              </div>
            )}
          </div>

          <TabsContent value="tickets" className="space-y-4">
            {/* Enhanced Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by ticket #, subject, or description..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px]">
                        <Filter className="w-3 h-3 mr-1" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Assignee" />
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

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={sortBy === 'priority' ? 'default' : 'outline'} 
                          size="icon"
                          onClick={() => setSortBy(sortBy === 'date' ? 'priority' : 'date')}
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Sort by {sortBy === 'date' ? 'priority' : 'date'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tickets Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="w-5 h-5" />
                    Support Tickets
                  </CardTitle>
                  <Badge variant="outline">{filteredTickets.length} tickets</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredTickets.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {search || statusFilter !== 'all' || priorityFilter !== 'all'
                        ? 'Try adjusting your filters to see more tickets'
                        : 'All caught up! No support tickets at the moment.'}
                    </p>
                    {(search || statusFilter !== 'all' || priorityFilter !== 'all') && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => {
                          setSearch('');
                          setStatusFilter('all');
                          setPriorityFilter('all');
                          setAssigneeFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[120px]">Ticket</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead className="w-[100px]">Category</TableHead>
                          <TableHead className="w-[90px]">Priority</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                          <TableHead className="w-[140px]">Assigned To</TableHead>
                          <TableHead className="w-[130px]">Created</TableHead>
                          <TableHead className="w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredTickets.map((ticket, index) => {
                            const statusCfg = statusConfig[ticket.status] || statusConfig.open;
                            const StatusIcon = statusCfg.icon;
                            const priorityCfg = priorityConfig[ticket.priority] || priorityConfig.medium;
                            const CategoryIcon = categoryIcons[ticket.category] || MessageSquare;
                            const ticketAge = differenceInHours(new Date(), new Date(ticket.created_at));
                            const isOld = ticketAge > 24 && (ticket.status === 'open' || ticket.status === 'in_progress');

                            return (
                              <motion.tr
                                key={ticket.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className={`group hover:bg-muted/50 ${isOld ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}
                              >
                                <TableCell>
                                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                    {ticket.ticket_number}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium truncate max-w-[200px]">{ticket.subject}</p>
                                    {isOld && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent>Over 24 hours old</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="gap-1 capitalize">
                                    <CategoryIcon className="w-3 h-3" />
                                    {ticket.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${priorityCfg.bgColor} ${priorityCfg.color} border-0`}>
                                    {priorityCfg.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${statusCfg.bgColor} ${statusCfg.color} border-0`}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusCfg.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {ticket.assigned_to ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Headphones className="w-3 h-3 text-primary" />
                                      </div>
                                      <span className="text-sm truncate max-w-[100px]">
                                        {getStaffName(ticket.assigned_to)}
                                      </span>
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground gap-1">
                                      <UserPlus className="w-3 h-3" />
                                      Unassigned
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p>{format(new Date(ticket.created_at), 'MMM d, h:mm a')}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
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
          <DialogContent className="max-w-2xl p-0 max-h-[90vh] overflow-hidden">
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
    </TooltipProvider>
  );
}
