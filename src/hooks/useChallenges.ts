import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface LoyaltyChallenge {
  id: string;
  title: string;
  description: string | null;
  challenge_type: 'daily' | 'weekly' | 'monthly' | 'special';
  criteria: Json;
  points_reward: number;
  bonus_reward: Json | null;
  starts_at: string;
  ends_at: string;
  max_completions: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
  created_at: string;
  updated_at: string;
  challenge?: LoyaltyChallenge;
}

export function useActiveChallenges() {
  return useQuery({
    queryKey: ['active-challenges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_challenges')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .gt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true });

      if (error) throw error;
      return data as LoyaltyChallenge[];
    },
  });
}

export function useUserChallenges() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-challenges', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_challenge_progress')
        .select(`
          *,
          challenge:loyalty_challenges(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (UserChallengeProgress & { challenge: LoyaltyChallenge })[];
    },
    enabled: !!user,
  });
}

export function useJoinChallenge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_challenge_progress')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          current_progress: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      toast.success('Challenge joined! Good luck!');
    },
    onError: () => {
      toast.error('Failed to join challenge');
    },
  });
}

export function useClaimChallengeReward() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (progressId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get progress with challenge info
      const { data: progress, error: fetchError } = await supabase
        .from('user_challenge_progress')
        .select('*, challenge:loyalty_challenges(*)')
        .eq('id', progressId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!progress.is_completed) throw new Error('Challenge not completed');
      if (progress.reward_claimed) throw new Error('Reward already claimed');

      const challenge = progress.challenge as LoyaltyChallenge;

      // Award points
      const { error: pointsError } = await supabase.rpc('add_loyalty_points', {
        p_user_id: user.id,
        p_points: challenge.points_reward,
        p_source: 'challenge',
        p_description: `Challenge completed: ${challenge.title}`,
        p_reference_id: progress.id,
      });

      if (pointsError) throw pointsError;

      // Mark reward as claimed
      const { error: updateError } = await supabase
        .from('user_challenge_progress')
        .update({ reward_claimed: true })
        .eq('id', progressId);

      if (updateError) throw updateError;

      return { points: challenge.points_reward, title: challenge.title };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-points'] });
      toast.success(`+${data.points} points from "${data.title}"!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to claim reward');
    },
  });
}

// Calculate time remaining for a challenge
export function getChallengeTimeRemaining(endsAt: string) {
  const end = new Date(endsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
}
