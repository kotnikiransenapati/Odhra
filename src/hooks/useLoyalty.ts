import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  points: number;
  lifetime_points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  streak_days: number;
  last_checkin_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';
  source: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  criteria: Record<string, unknown>;
  points_reward: number;
  is_active: boolean;
  sort_order: number;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  metadata: Record<string, unknown>;
  badge?: BadgeDefinition;
}

// Tier thresholds
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 10000,
};

// Tier benefits
export const TIER_BENEFITS = {
  bronze: {
    pointsMultiplier: 1,
    freeShippingThreshold: 999,
    exclusiveDeals: false,
    earlyAccess: false,
    birthdayBonus: 50,
  },
  silver: {
    pointsMultiplier: 1.25,
    freeShippingThreshold: 799,
    exclusiveDeals: true,
    earlyAccess: false,
    birthdayBonus: 100,
  },
  gold: {
    pointsMultiplier: 1.5,
    freeShippingThreshold: 499,
    exclusiveDeals: true,
    earlyAccess: true,
    birthdayBonus: 200,
  },
  platinum: {
    pointsMultiplier: 2,
    freeShippingThreshold: 0,
    exclusiveDeals: true,
    earlyAccess: true,
    birthdayBonus: 500,
  },
  diamond: {
    pointsMultiplier: 2.5,
    freeShippingThreshold: 0,
    exclusiveDeals: true,
    earlyAccess: true,
    birthdayBonus: 1000,
  },
};

export function useLoyaltyPoints() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['loyalty-points', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as LoyaltyPoints | null;
    },
    enabled: !!user,
  });
}

export function useLoyaltyTransactions(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['loyalty-transactions', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as LoyaltyTransaction[];
    },
    enabled: !!user,
  });
}

export function useBadgeDefinitions() {
  return useQuery({
    queryKey: ['badge-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as BadgeDefinition[];
    },
  });
}

export function useUserAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('achievements')
        .select('*, badge:badge_definitions(*)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data as Achievement[];
    },
    enabled: !!user,
  });
}

export function useDailyCheckin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Get current loyalty record
      const { data: loyalty } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastCheckin = loyalty?.last_checkin_at 
        ? new Date(loyalty.last_checkin_at).toISOString().split('T')[0]
        : null;

      if (lastCheckin === today) {
        throw new Error('Already checked in today');
      }

      // Calculate streak
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = 1;
      if (lastCheckin === yesterdayStr && loyalty?.streak_days) {
        newStreak = loyalty.streak_days + 1;
      }

      // Calculate bonus points based on streak
      let bonusPoints = 5; // Base daily points
      if (newStreak >= 7) bonusPoints = 10;
      if (newStreak >= 14) bonusPoints = 15;
      if (newStreak >= 30) bonusPoints = 25;

      // Update or create loyalty record
      if (loyalty) {
        const { error } = await supabase
          .from('loyalty_points')
          .update({
            points: loyalty.points + bonusPoints,
            lifetime_points: loyalty.lifetime_points + bonusPoints,
            streak_days: newStreak,
            last_checkin_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('loyalty_points')
          .insert({
            user_id: user.id,
            points: bonusPoints,
            lifetime_points: bonusPoints,
            streak_days: newStreak,
            last_checkin_at: now.toISOString(),
          });

        if (error) throw error;
      }

      // Record transaction
      await supabase.from('loyalty_transactions').insert({
        user_id: user.id,
        points: bonusPoints,
        transaction_type: 'earn',
        source: 'daily_checkin',
        description: `Daily check-in reward (${newStreak} day streak)`,
      });

      return { points: bonusPoints, streak: newStreak };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-points'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
      toast.success(`+${data.points} points! Day ${data.streak} streak 🔥`);
    },
    onError: (error: Error) => {
      if (error.message === 'Already checked in today') {
        toast.info('You\'ve already checked in today. Come back tomorrow!');
      } else {
        toast.error('Failed to check in');
      }
    },
  });
}

export function useRedeemPoints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ points, description }: { points: number; description: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: loyalty } = await supabase
        .from('loyalty_points')
        .select('points')
        .eq('user_id', user.id)
        .single();

      if (!loyalty || loyalty.points < points) {
        throw new Error('Insufficient points');
      }

      const { error } = await supabase
        .from('loyalty_points')
        .update({
          points: loyalty.points - points,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase.from('loyalty_transactions').insert({
        user_id: user.id,
        points: -points,
        transaction_type: 'redeem',
        description,
      });

      return { redeemed: points, remaining: loyalty.points - points };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-points'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
      toast.success(`Redeemed ${data.redeemed} points!`);
    },
    onError: () => {
      toast.error('Failed to redeem points');
    },
  });
}

// Helper to calculate tier
export function calculateTier(lifetimePoints: number): keyof typeof TIER_THRESHOLDS {
  if (lifetimePoints >= TIER_THRESHOLDS.diamond) return 'diamond';
  if (lifetimePoints >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (lifetimePoints >= TIER_THRESHOLDS.gold) return 'gold';
  if (lifetimePoints >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

// Helper to get next tier info
export function getNextTierInfo(currentTier: string, lifetimePoints: number) {
  const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
  const currentIndex = tiers.indexOf(currentTier as typeof tiers[number]);
  
  if (currentIndex === tiers.length - 1) {
    return null; // Already at max tier
  }

  const nextTier = tiers[currentIndex + 1];
  const pointsNeeded = TIER_THRESHOLDS[nextTier] - lifetimePoints;

  return {
    tier: nextTier,
    pointsNeeded,
    threshold: TIER_THRESHOLDS[nextTier],
  };
}
