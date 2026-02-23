import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  total_referrals: number;
  successful_referrals: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  referrer_reward: number;
  referred_reward: number;
  qualifying_order_id: string | null;
  created_at: string;
  completed_at: string | null;
}

// Referral rewards configuration
export const REFERRAL_CONFIG = {
  referrerReward: 100, // Points for referrer
  referredReward: 50,  // Points for new user
  minOrderAmount: 499, // Minimum order for referral to complete
};

export function useReferralCode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ReferralCode | null;
    },
    enabled: !!user,
  });
}

export function useGenerateReferralCode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Call the database function to generate code
      const { data, error } = await supabase.rpc('generate_referral_code', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-code'] });
      toast.success('Referral code generated!');
    },
    onError: () => {
      toast.error('Failed to generate referral code');
    },
  });
}

export function useMyReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user,
  });
}

export function useApplyReferralCode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if user already has a referral
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', user.id)
        .maybeSingle();

      if (existingReferral) {
        throw new Error('You have already used a referral code');
      }

      // Find the referral code (RLS now allows reading active codes)
      const { data: referralCode, error: codeError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (codeError || !referralCode) {
        throw new Error('Invalid referral code');
      }

      // Can't refer yourself
      if (referralCode.user_id === user.id) {
        throw new Error('You cannot use your own referral code');
      }

      // Create the referral record
      const { error: insertError } = await supabase.from('referrals').insert({
        referrer_id: referralCode.user_id,
        referred_id: user.id,
        referral_code: code.toUpperCase(),
        status: 'pending',
        referrer_reward: REFERRAL_CONFIG.referrerReward,
        referred_reward: REFERRAL_CONFIG.referredReward,
      });

      if (insertError) throw insertError;

      // Give the new user their welcome bonus via RPC (SECURITY DEFINER)
      await supabase.rpc('add_loyalty_points', {
        p_user_id: user.id,
        p_points: REFERRAL_CONFIG.referredReward,
        p_source: 'referral_bonus',
        p_description: 'Welcome bonus for using a referral code',
      });

      return { success: true, bonusPoints: REFERRAL_CONFIG.referredReward };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-points'] });
      queryClient.invalidateQueries({ queryKey: ['referral-code'] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-referrals'] });
      toast.success(`Referral applied! You earned ${data.bonusPoints} bonus points!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useReferralStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: referralCode } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);

      const pending = referrals?.filter(r => r.status === 'pending').length || 0;
      const completed = referrals?.filter(r => r.status === 'completed').length || 0;
      const totalEarned = referrals
        ?.filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.referrer_reward, 0) || 0;

      return {
        code: referralCode?.code || null,
        totalReferrals: referralCode?.total_referrals || 0,
        successfulReferrals: completed,
        pendingReferrals: pending,
        totalEarnings: totalEarned,
      };
    },
    enabled: !!user,
  });
}
