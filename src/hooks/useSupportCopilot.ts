import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupportAiSuggestion {
  id: string;
  ticket_id: string;
  requested_by: string | null;
  source: 'admin' | 'customer' | 'system';
  status: 'draft' | 'used' | 'dismissed' | 'expired';
  summary: string;
  suggested_reply: string;
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry' | 'urgent';
  urgency_score: number;
  recommended_actions: string[];
  model: string | null;
  ai_run_id: string | null;
  metadata: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export function useTicketAiSuggestions(ticketId?: string) {
  return useQuery({
    queryKey: ['ticket-ai-suggestions', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase.rpc('list_ticket_ai_suggestions' as any, { _ticket_id: ticketId });
      if (error) throw error;
      return (data || []) as SupportAiSuggestion[];
    },
    enabled: !!ticketId,
    staleTime: 30_000,
  });
}

export function useSupportCopilot(ticketId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mode = 'admin_reply', tone }: { mode?: 'admin_reply' | 'customer_self_help'; tone?: string }) => {
      if (!ticketId) throw new Error('Missing ticket');
      const { data, error } = await supabase.functions.invoke('support-copilot', {
        body: { ticketId, mode, tone },
      });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.error === 'rate_limited') throw new Error('AI is busy. Please try again shortly.');
        if (data?.error === 'credits_exhausted') throw new Error('AI credits are exhausted.');
        throw new Error(data?.message || 'AI suggestion could not be generated.');
      }
      return data.suggestion as SupportAiSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-ai-suggestions', ticketId] });
      toast.success('AI suggestion ready');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'AI suggestion failed'),
  });
}

export function useMarkAiSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, ticketId }: { id: string; status: 'used' | 'dismissed'; ticketId: string }) => {
      const { error } = await (supabase.from('ai_support_suggestions') as any)
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      return { ticketId };
    },
    onSuccess: ({ ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-ai-suggestions', ticketId] });
    },
  });
}