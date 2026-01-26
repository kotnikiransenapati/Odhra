import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface FraudRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: Json;
  action: string;
  risk_score_contribution: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FraudSignal {
  id: string;
  order_id: string;
  user_id: string | null;
  signal_type: string;
  rule_id: string | null;
  risk_score: number;
  details: Json;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface FraudCheckResult {
  order_id: string;
  risk_score: number;
  action: string;
  signals: Json;
}

export function useFraudRules() {
  return useQuery({
    queryKey: ['fraud-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fraud_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FraudRule[];
    },
  });
}

export function useFraudSignals(status?: string, limit = 50) {
  return useQuery({
    queryKey: ['fraud-signals', status, limit],
    queryFn: async () => {
      let query = supabase
        .from('fraud_signals')
        .select(`
          *,
          orders:order_id (
            order_number,
            total_amount,
            customer_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (FraudSignal & { orders: { order_number: string; total_amount: number; customer_id: string } | null })[];
    },
  });
}

export function useFlaggedOrders() {
  return useQuery({
    queryKey: ['flagged-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          fraud_signals (*)
        `)
        .in('fraud_status', ['flagged', 'held', 'blocked'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCheckOrderFraud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .rpc('check_order_fraud', { p_order_id: orderId });

      if (error) throw error;
      return data as unknown as FraudCheckResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fraud-signals'] });
      queryClient.invalidateQueries({ queryKey: ['flagged-orders'] });
      
      if (data.action !== 'clean') {
        toast.warning(`Order flagged: Risk score ${data.risk_score}`);
      }
    },
    onError: () => {
      toast.error('Failed to check order for fraud');
    },
  });
}

export function useUpdateFraudSignalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      signalId, 
      status 
    }: { 
      signalId: string; 
      status: string;
    }) => {
      const { data, error } = await supabase
        .from('fraud_signals')
        .update({
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', signalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-signals'] });
      queryClient.invalidateQueries({ queryKey: ['flagged-orders'] });
      toast.success('Fraud signal updated');
    },
    onError: () => {
      toast.error('Failed to update fraud signal');
    },
  });
}

export function useCreateFraudRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: {
      name: string;
      description?: string;
      rule_type: string;
      conditions: Json;
      action?: string;
      risk_score_contribution?: number;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('fraud_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-rules'] });
      toast.success('Fraud rule created');
    },
    onError: () => {
      toast.error('Failed to create fraud rule');
    },
  });
}

export function useUpdateFraudRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      description: string | null;
      rule_type: string;
      conditions: Json;
      action: string;
      risk_score_contribution: number;
      is_active: boolean;
    }>) => {
      const { data, error } = await supabase
        .from('fraud_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-rules'] });
      toast.success('Fraud rule updated');
    },
    onError: () => {
      toast.error('Failed to update fraud rule');
    },
  });
}

export function useDeleteFraudRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fraud_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-rules'] });
      toast.success('Fraud rule deleted');
    },
    onError: () => {
      toast.error('Failed to delete fraud rule');
    },
  });
}
