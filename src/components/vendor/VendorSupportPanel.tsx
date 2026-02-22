import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Headphones, Plus, Send, Clock, CheckCircle2, Loader2, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

export function VendorSupportPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', category: 'general', priority: 'medium' });

  // Get vendor ID
  const { data: vendor } = useQuery({
    queryKey: ['my-vendor-for-support', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id!)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['vendor-support-tickets', vendor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_support_tickets')
        .select('*')
        .eq('vendor_id', vendor?.id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendor?.id,
  });

  const { data: ticketMessages } = useQuery({
    queryKey: ['vendor-ticket-messages', selectedTicketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_support_messages')
        .select('*')
        .eq('ticket_id', selectedTicketId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTicketId,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('vendor_support_tickets')
        .insert({
          ...newTicket,
          vendor_id: vendor?.id!,
          ticket_number: 'VTK-' + Date.now().toString().slice(-6),
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-support-tickets'] });
      setShowNew(false);
      setNewTicket({ subject: '', description: '', category: 'general', priority: 'medium' });
      toast.success('Support ticket created');
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('vendor_support_messages')
        .insert({
          ticket_id: selectedTicketId!,
          sender_id: user?.id!,
          sender_type: 'vendor',
          message: replyText,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-ticket-messages'] });
      setReplyText('');
    },
  });

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            Support Tickets
          </CardTitle>
          <Button size="sm" onClick={() => setShowNew(true)} className="gap-1">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedTicketId ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(null)}>
              ← Back to tickets
            </Button>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {ticketMessages?.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'vendor' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 ${
                      msg.sender_type === 'vendor' ? 'bg-accent text-accent-foreground' : 'bg-muted'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-[10px] opacity-70 mt-1">
                        {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 min-h-[60px]"
              />
              <Button onClick={() => sendMessage.mutate()} disabled={!replyText.trim()} className="self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {tickets?.map(ticket => (
              <div
                key={ticket.id}
                className="p-4 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm">{ticket.subject}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{ticket.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  #{ticket.ticket_number} · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
            {tickets?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No support tickets yet</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Subject"
              value={newTicket.subject}
              onChange={(e) => setNewTicket(p => ({ ...p, subject: e.target.value }))}
            />
            <Select value={newTicket.category} onValueChange={(v) => setNewTicket(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="orders">Orders</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newTicket.priority} onValueChange={(v) => setNewTicket(p => ({ ...p, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Describe your issue..."
              value={newTicket.description}
              onChange={(e) => setNewTicket(p => ({ ...p, description: e.target.value }))}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              onClick={() => createTicket.mutate()}
              disabled={!newTicket.subject || !newTicket.description || createTicket.isPending}
            >
              {createTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
