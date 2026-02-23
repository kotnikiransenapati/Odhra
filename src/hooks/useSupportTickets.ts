import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeText } from '@/lib/sanitize';
import { useEffect } from 'react';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  order_id: string | null;
  product_id: string | null;
  attachments: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  satisfaction_rating: number | null;
  satisfaction_feedback: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_reply: boolean;
  attachments: string[];
  created_at: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  category: string;
  priority?: string;
  order_id?: string;
  product_id?: string;
}

export function useSupportTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscription for user's tickets
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-support-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Support ticket changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['support-tickets', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_ticket_messages',
        },
        (payload) => {
          console.log('Ticket message changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['support-ticket-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: CreateTicketData & { autoAssignTo?: string | null }) => {
      if (!user) throw new Error('User not authenticated');

      // Build the insert object with proper typing and sanitized input
      const baseData = {
        user_id: user.id,
        subject: sanitizeText(ticketData.subject, 300),
        description: sanitizeText(ticketData.description, 10000),
        category: ticketData.category,
        priority: ticketData.priority || 'medium',
        order_id: ticketData.order_id || null,
        product_id: ticketData.product_id || null,
      };

      // Auto-assign for urgent/high priority tickets if assignee provided
      const finalData = ticketData.autoAssignTo 
        ? { ...baseData, assigned_to: ticketData.autoAssignTo, status: 'in_progress' as const }
        : baseData;

      const { data, error } = await supabase
        .from('support_tickets')
        .insert(finalData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['staff-workload'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-ticket-stats'] });
      
      const wasAutoAssigned = data.assigned_to !== null;
      toast.success(
        wasAutoAssigned 
          ? 'Support ticket created and auto-assigned' 
          : 'Support ticket created successfully'
      );
    },
    onError: (error) => {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create support ticket');
    },
  });

  return {
    tickets,
    isLoading,
    createTicket: createTicketMutation.mutateAsync,
    isCreating: createTicketMutation.isPending,
  };
}

export function useSupportTicket(ticketId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscription for this specific ticket
  useEffect(() => {
    if (!ticketId || !user) return;

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          console.log('New ticket message:', payload);
          queryClient.invalidateQueries({ queryKey: ['support-ticket-messages', ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, user, queryClient]);

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      return data as SupportTicket;
    },
    enabled: !!ticketId && !!user,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['support-ticket-messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticketId && !!user,
  });

  const addMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user || !ticketId) throw new Error('Invalid state');

      const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message,
          is_staff_reply: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-messages', ticketId] });
      toast.success('Message sent');
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (feedback?: { rating: number; feedback?: string }) => {
      if (!ticketId) throw new Error('Invalid ticket');

      const updateData: Record<string, unknown> = {
        status: 'closed',
        resolved_at: new Date().toISOString(),
      };

      if (feedback) {
        updateData.satisfaction_rating = feedback.rating;
        updateData.satisfaction_feedback = feedback.feedback || null;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      toast.success('Ticket closed');
    },
  });

  return {
    ticket,
    messages,
    isLoading: ticketLoading || messagesLoading,
    addMessage: addMessageMutation.mutateAsync,
    isSending: addMessageMutation.isPending,
    closeTicket: closeTicketMutation.mutateAsync,
    isClosing: closeTicketMutation.isPending,
  };
}

export function useAdminSupportTickets() {
  const queryClient = useQueryClient();

  // Set up real-time subscription for all support tickets (admin)
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          console.log('Admin: Support ticket changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['staff-workload'] });
          queryClient.invalidateQueries({ queryKey: ['unassigned-ticket-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_ticket_messages',
        },
        (payload) => {
          console.log('Admin: Ticket message changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['support-ticket-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: string; updates: Partial<SupportTicket> }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
      queryClient.invalidateQueries({ queryKey: ['staff-workload'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-ticket-stats'] });
      toast.success('Ticket updated');
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message, userId }: { ticketId: string; message: string; userId: string }) => {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          user_id: userId,
          message,
          is_staff_reply: true,
        });

      if (error) throw error;

      // Update ticket status to in_progress if it's open
      await supabase
        .from('support_tickets')
        .update({ status: 'in_progress' })
        .eq('id', ticketId)
        .eq('status', 'open');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket-messages'] });
      queryClient.invalidateQueries({ queryKey: ['staff-workload'] });
      toast.success('Reply sent');
    },
  });

  return {
    tickets,
    isLoading,
    refetch,
    updateTicket: updateTicketMutation.mutateAsync,
    sendReply: replyMutation.mutateAsync,
    isUpdating: updateTicketMutation.isPending,
    isReplying: replyMutation.isPending,
  };
}
