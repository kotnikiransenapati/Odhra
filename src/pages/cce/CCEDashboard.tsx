import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Headphones, Search, Clock, CheckCircle2, AlertCircle, Send,
  User, MessageSquare, Star, TrendingUp, Loader2, Pin,
  Tag, Zap, BarChart3, Timer, FileText, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';

export default function CCEDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Fetch tickets assigned to this agent or unassigned
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['cce-tickets', statusFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch selected ticket details
  const { data: ticketDetail } = useQuery({
    queryKey: ['cce-ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', selectedTicketId)
        .single();

      const { data: messages } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicketId)
        .order('created_at', { ascending: true });

      const { data: notes } = await supabase
        .from('ticket_internal_notes')
        .select('*')
        .eq('ticket_id', selectedTicketId)
        .order('created_at', { ascending: false });

      // Customer info
      let customer = null;
      if (ticket?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', ticket.user_id)
          .single();
        
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount, status')
          .eq('customer_id', ticket.user_id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        customer = { ...profile, recentOrders: orders || [] };
      }

      return { ticket, messages: messages || [], notes: notes || [], customer };
    },
    enabled: !!selectedTicketId,
  });

  // Canned responses
  const { data: cannedResponses } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // SLA policies
  const { data: slaPolicies } = useQuery({
    queryKey: ['sla-policies-cce'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_policies')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Agent metrics
  const { data: agentMetrics } = useQuery({
    queryKey: ['agent-metrics', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: resolved } = await supabase
        .from('support_tickets')
        .select('id, created_at, resolved_at')
        .eq('assigned_to', user.id)
        .eq('status', 'resolved');

      const { data: active } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('assigned_to', user.id)
        .in('status', ['open', 'in_progress']);

      const { data: ratings } = await supabase
        .from('agent_csat_ratings')
        .select('rating')
        .eq('agent_id', user.id);

      const avgRating = ratings?.length
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      const avgResolution = resolved?.length
        ? resolved.reduce((sum, t) => {
            if (t.resolved_at) {
              return sum + differenceInHours(new Date(t.resolved_at), new Date(t.created_at));
            }
            return sum;
          }, 0) / resolved.length
        : 0;

      return {
        totalResolved: resolved?.length || 0,
        activeTickets: active?.length || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        avgResolutionHours: Math.round(avgResolution),
        totalRatings: ratings?.length || 0,
      };
    },
    enabled: !!user,
  });

  // Send reply mutation
  const sendReply = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          user_id: user?.id!,
          is_staff_reply: true,
          message,
        });
      if (error) throw error;

      await supabase
        .from('support_tickets')
        .update({ status: 'in_progress', assigned_to: user?.id })
        .eq('id', ticketId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cce-ticket-detail'] });
      queryClient.invalidateQueries({ queryKey: ['cce-tickets'] });
      setReplyText('');
      toast.success('Reply sent');
    },
  });

  // Add internal note
  const addNote = useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const { error } = await supabase
        .from('ticket_internal_notes')
        .insert({
          ticket_id: ticketId,
          author_id: user?.id!,
          note: content,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cce-ticket-detail'] });
      setInternalNote('');
      toast.success('Note added');
    },
  });

  // Assign to self
  const assignToSelf = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_to: user?.id, status: 'in_progress' })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cce-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['cce-ticket-detail'] });
      toast.success('Ticket assigned to you');
    },
  });

  // Resolve ticket
  const resolveTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cce-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['cce-ticket-detail'] });
      toast.success('Ticket resolved');
    },
  });

  const getSLAStatus = (ticket: any) => {
    const policy = slaPolicies?.find(p => p.priority === ticket.priority);
    if (!policy) return { status: 'unknown', hoursLeft: 0 };
    const hoursElapsed = differenceInHours(new Date(), new Date(ticket.created_at));
    const hoursLeft = policy.resolution_hours - hoursElapsed;
    if (hoursLeft < 0) return { status: 'breached', hoursLeft };
    if (hoursLeft < policy.resolution_hours * 0.25) return { status: 'warning', hoursLeft };
    return { status: 'ok', hoursLeft };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high': return 'bg-warning/10 text-warning border-warning/20';
      case 'medium': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Support Agent Dashboard</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {agentMetrics && (
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-bold text-lg">{agentMetrics.activeTickets}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{agentMetrics.totalResolved}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
                <div className="text-center flex items-center gap-1">
                  <Star className="w-4 h-4 text-warning" />
                  <p className="font-bold text-lg">{agentMetrics.avgRating || '-'}</p>
                  <p className="text-xs text-muted-foreground">CSAT</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Ticket Queue */}
        <div className="w-96 border-r border-border flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="flex-1 h-8 text-xs">
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
            </div>
          </div>

          {/* Ticket List */}
          <ScrollArea className="flex-1">
            {ticketsLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tickets?.map(ticket => {
                  const sla = getSLAStatus(ticket);
                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedTicketId === ticket.id ? 'bg-accent/5 border-l-2 border-l-accent' : ''}`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm truncate flex-1">{ticket.subject}</p>
                        <Badge variant="outline" className={`text-[10px] ml-2 ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        #{ticket.ticket_number}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </span>
                        {sla.status === 'breached' && (
                          <Badge variant="destructive" className="text-[10px]">SLA Breached</Badge>
                        )}
                        {sla.status === 'warning' && (
                          <Badge variant="outline" className="text-[10px] border-warning text-warning">
                            <Timer className="w-3 h-3 mr-1" />
                            {Math.abs(sla.hoursLeft)}h left
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Ticket Detail */}
        <div className="flex-1 flex">
          {selectedTicketId && ticketDetail ? (
            <>
              {/* Conversation */}
              <div className="flex-1 flex flex-col">
                {/* Ticket Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-lg">{ticketDetail.ticket?.subject}</h2>
                      <p className="text-sm text-muted-foreground">
                        #{ticketDetail.ticket?.ticket_number} · {ticketDetail.ticket?.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!ticketDetail.ticket?.assigned_to && (
                        <Button size="sm" onClick={() => assignToSelf.mutate(selectedTicketId)}>
                          Assign to Me
                        </Button>
                      )}
                      {ticketDetail.ticket?.status !== 'resolved' && (
                        <Button size="sm" variant="outline" onClick={() => resolveTicket.mutate(selectedTicketId)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4 max-w-2xl">
                    {ticketDetail.messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_staff_reply ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl p-4 ${
                          msg.is_staff_reply
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-[10px] mt-2 opacity-70">
                            {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Reply Box */}
                <div className="p-4 border-t border-border">
                  {/* Canned Response Quick Insert */}
                  {cannedResponses && cannedResponses.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {cannedResponses.slice(0, 5).map(cr => (
                        <Button
                          key={cr.id}
                          variant="outline"
                          size="sm"
                          className="text-xs whitespace-nowrap"
                          onClick={() => setReplyText(prev => prev + cr.content)}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          {cr.title}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 min-h-[60px] max-h-[120px]"
                    />
                    <Button
                      onClick={() => sendReply.mutate({ ticketId: selectedTicketId, message: replyText })}
                      disabled={!replyText.trim() || sendReply.isPending}
                      className="self-end"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Customer Context Sidebar */}
              <div className="w-80 border-l border-border overflow-y-auto">
                {ticketDetail.customer && (
                  <div className="p-4 space-y-6">
                    {/* Customer Info */}
                    <div>
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Customer
                      </h3>
                      <div className="space-y-2">
                        <p className="font-medium">{ticketDetail.customer.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{ticketDetail.customer.email}</p>
                        <p className="text-sm text-muted-foreground">{ticketDetail.customer.phone}</p>
                      </div>
                    </div>

                    {/* Recent Orders */}
                    <div>
                      <h3 className="font-semibold text-sm mb-3">Recent Orders</h3>
                      <div className="space-y-2">
                        {ticketDetail.customer.recentOrders?.map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                            <span className="capitalize">{order.status}</span>
                            <span className="font-medium">₹{order.total_amount?.toLocaleString()}</span>
                          </div>
                        ))}
                        {ticketDetail.customer.recentOrders?.length === 0 && (
                          <p className="text-sm text-muted-foreground">No orders</p>
                        )}
                      </div>
                    </div>

                    {/* Internal Notes */}
                    <div>
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Internal Notes
                      </h3>
                      <div className="space-y-2 mb-3">
                        {ticketDetail.notes.map((note: any) => (
                          <div key={note.id} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                            <p className="text-sm">{note.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          placeholder="Add note..."
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addNote.mutate({ ticketId: selectedTicketId, content: internalNote })}
                          disabled={!internalNote.trim()}
                        >
                          <Pin className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Headphones className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a ticket</p>
                <p className="text-sm">Choose a ticket from the queue to start</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
