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

      // Check user's points
      const { data: loyalty, error: loyaltyError } = await supabase
        .from('loyalty_points')
        .select('points, tier')
        .eq('user_id', user.id)
        .single();

      if (loyaltyError) throw loyaltyError;
      if (!loyalty || loyalty.points < option.points_cost) {
        throw new Error('Insufficient points');
      }

      // Check tier requirement
      if (option.min_tier) {
        const userTierIndex = TIER_ORDER.indexOf(loyalty.tier);
        const requiredTierIndex = TIER_ORDER.indexOf(option.min_tier);
        if (userTierIndex < requiredTierIndex) {
          throw new Error(`Requires ${option.min_tier} tier or higher`);
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

      // Deduct points
      const { error: deductError } = await supabase
        .from('loyalty_points')
        .update({
          points: loyalty.points - option.points_cost,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (deductError) throw deductError;

      // Record transaction
      await supabase.from('loyalty_transactions').insert({
        user_id: user.id,
        points: -option.points_cost,
        transaction_type: 'redeem',
        source: 'redemption',
        description: `Redeemed: ${option.name}`,
        reference_id: optionId,
      });

      // Create redemption record
      const { data: redemption, error: redemptionError } = await supabase
        .from('points_redemptions')
        .insert({
          user_id: user.id,
          option_id: optionId,
          points_spent: option.points_cost,
          reward_code: rewardCode,
          reward_details: {
            name: option.name,
            type: option.reward_type,
            value: option.reward_value,
          },
          status: 'active',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (redemptionError) throw redemptionError;

      return { redemption, option };
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
