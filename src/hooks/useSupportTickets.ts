import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
    mutationFn: async (ticketData: CreateTicketData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: ticketData.subject,
          description: ticketData.description,
          category: ticketData.category,
          priority: ticketData.priority || 'medium',
          order_id: ticketData.order_id || null,
          product_id: ticketData.product_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Support ticket created successfully');
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

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
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
      toast.success('Reply sent');
    },
  });

  return {
    tickets,
    isLoading,
    updateTicket: updateTicketMutation.mutateAsync,
    sendReply: replyMutation.mutateAsync,
    isUpdating: updateTicketMutation.isPending,
    isReplying: replyMutation.isPending,
  };
}
