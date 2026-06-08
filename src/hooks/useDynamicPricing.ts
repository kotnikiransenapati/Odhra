import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface PricingRule {
  id: string;
  vendor_id: string | null;
  product_id: string | null;
  rule_name: string;
  rule_type: string;
  conditions: Json;
  price_adjustment: Json;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DynamicPriceResult {
  base_price: number;
  final_price: number;
  discount: number;
  discount_percentage: number;
  applied_rules: Array<{ rule_id: string; adjustment: number }>;
}

export function useDynamicPrice(productId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dynamic-price', productId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_dynamic_price', {
          p_product_id: productId,
          p_user_id: user?.id || null,
          p_quantity: 1
        });

      if (error) throw error;
      return data as unknown as DynamicPriceResult;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePricingRules(vendorId?: string) {
  return useQuery({
    queryKey: ['pricing-rules', vendorId],
    queryFn: async () => {
      let query = supabase
        .from('pricing_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PricingRule[];
    },
  });
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: {
      vendor_id?: string;
      product_id?: string;
      rule_name: string;
      rule_type: string;
      conditions: Json;
      price_adjustment: Json;
      priority?: number;
      is_active?: boolean;
      starts_at?: string;
      ends_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast.success('Pricing rule created');
    },
    onError: () => {
      toast.error('Failed to create pricing rule');
    },
  });
}

export function useUpdatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      rule_name: string;
      rule_type: string;
      conditions: Json;
      price_adjustment: Json;
      priority: number;
      is_active: boolean;
      starts_at: string | null;
      ends_at: string | null;
    }>) => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast.success('Pricing rule updated');
    },
    onError: () => {
      toast.error('Failed to update pricing rule');
    },
  });
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast.success('Pricing rule deleted');
    },
    onError: () => {
      toast.error('Failed to delete pricing rule');
    },
  });
}
