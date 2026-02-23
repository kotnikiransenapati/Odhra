import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface RedemptionOption {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: 'discount_percentage' | 'discount_fixed' | 'free_shipping' | 'gift_card';
  reward_value: Json;
  min_tier: string | null;
  is_active: boolean;
  usage_limit_per_user: number | null;
  created_at: string;
  updated_at: string;
}

export interface PointsRedemption {
  id: string;
  user_id: string;
  option_id: string | null;
  points_spent: number;
  reward_code: string | null;
  reward_details: Json;
  status: 'active' | 'used' | 'expired';
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export function useRedemptionOptions(userTier?: string) {
  return useQuery({
    queryKey: ['redemption-options', userTier],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_redemption_options')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });

      if (error) throw error;
      
      // Filter by tier if provided
      if (userTier) {
        const userTierIndex = TIER_ORDER.indexOf(userTier);
        return (data as RedemptionOption[]).filter(option => {
          if (!option.min_tier) return true;
          const optionTierIndex = TIER_ORDER.indexOf(option.min_tier);
          return userTierIndex >= optionTierIndex;
        });
      }
      
      return data as RedemptionOption[];
    },
  });
}

export function useUserRedemptions(status?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-redemptions', user?.id, status],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('points_redemptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PointsRedemption[];
    },
    enabled: !!user,
  });
}

export function useActiveRedemptionCodes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-redemption-codes', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('points_redemptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) throw error;
      return data as PointsRedemption[];
    },
    enabled: !!user,
  });
}

export function useRedeemPoints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (optionId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get the redemption option
      const { data: option, error: optionError } = await supabase
        .from('points_redemption_options')
        .select('*')
        .eq('id', optionId)
        .single();

      if (optionError) throw optionError;

      // Check tier requirement client-side first
      if (option.min_tier) {
        const { data: loyalty } = await supabase
          .from('loyalty_points')
          .select('tier')
          .eq('user_id', user.id)
          .single();

        if (loyalty) {
          const userTierIndex = TIER_ORDER.indexOf(loyalty.tier);
          const requiredTierIndex = TIER_ORDER.indexOf(option.min_tier);
          if (userTierIndex < requiredTierIndex) {
            throw new Error(`Requires ${option.min_tier} tier or higher`);
          }
        }
      }

      // Generate cryptographically secure reward code
      const randomBytes = new Uint8Array(6);
      crypto.getRandomValues(randomBytes);
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const suffix = Array.from(randomBytes).map(b => charset[b % charset.length]).join('');
      const rewardCode = `RWD-${suffix}`;
      
      // Set expiry (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Atomic redemption via RPC (prevents race conditions / double-spend)
      const { data: result, error: rpcError } = await supabase.rpc('redeem_loyalty_points', {
        p_user_id: user.id,
        p_points_cost: option.points_cost,
        p_option_id: optionId,
        p_reward_code: rewardCode,
        p_reward_details: {
          name: option.name,
          type: option.reward_type,
          value: option.reward_value,
        },
        p_expires_at: expiresAt.toISOString(),
      });

      if (rpcError) throw rpcError;

      const rpcResult = result as { success: boolean; error?: string; reward_code?: string; redemption_id?: string };
      if (!rpcResult.success) {
        throw new Error(rpcResult.error || 'Redemption failed');
      }

      return { redemption: { reward_code: rpcResult.reward_code, id: rpcResult.redemption_id }, option };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-points'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['active-redemption-codes'] });
      toast.success(`Redeemed! Your code: ${data.redemption.reward_code}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to redeem points');
    },
  });
}
