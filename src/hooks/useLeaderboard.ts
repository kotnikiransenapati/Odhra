import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  lifetime_points: number;
  tier: string;
  streak_days: number;
  badges_count: number;
  rank: number;
}

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['loyalty-leaderboard', limit],
    queryFn: async () => {
      // Using the view we created
      const { data, error } = await supabase
        .from('loyalty_leaderboard')
        .select('*')
        .limit(limit);

      if (error) {
        // Fallback to direct query if view fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('loyalty_points')
          .select(`
            user_id,
            lifetime_points,
            tier,
            streak_days,
            profiles!inner(full_name, avatar_url)
          `)
          .gt('lifetime_points', 0)
          .order('lifetime_points', { ascending: false })
          .limit(limit);

        if (fallbackError) throw fallbackError;

        return (fallbackData || []).map((item, index) => ({
          user_id: item.user_id,
          full_name: (item.profiles as any)?.full_name,
          avatar_url: (item.profiles as any)?.avatar_url,
          lifetime_points: item.lifetime_points || 0,
          tier: item.tier || 'bronze',
          streak_days: item.streak_days || 0,
          badges_count: 0,
          rank: index + 1,
        })) as LeaderboardEntry[];
      }

      return data as LeaderboardEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUserRank() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-rank', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get user's points
      const { data: userPoints, error: userError } = await supabase
        .from('loyalty_points')
        .select('lifetime_points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userError) throw userError;
      if (!userPoints) return null;

      // Count users with more points
      const { count, error: countError } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .gt('lifetime_points', userPoints.lifetime_points);

      if (countError) throw countError;

      return {
        rank: (count || 0) + 1,
        points: userPoints.lifetime_points,
      };
    },
    enabled: !!user,
  });
}
