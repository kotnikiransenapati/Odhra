import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  Medal,
  Crown,
  Flame,
  TrendingUp
} from 'lucide-react';
import { useLeaderboard, useUserRank } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';

const tierColors = {
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  platinum: 'text-purple-500',
  diamond: 'text-cyan-500',
};

const rankIcons = [
  { icon: Crown, color: 'text-yellow-500' },
  { icon: Medal, color: 'text-slate-400' },
  { icon: Medal, color: 'text-amber-600' },
];

export function LeaderboardCard() {
  const { user } = useAuth();
  const { data: leaderboard, isLoading } = useLeaderboard(10);
  const { data: userRank } = useUserRank();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="h-4 bg-muted rounded flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
          {userRank && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="w-3 h-3" />
              Your Rank: #{userRank.rank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!leaderboard?.length ? (
          <p className="text-center text-muted-foreground py-6">
            No rankings yet. Be the first to earn points!
          </p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = user?.id === entry.user_id;
              const RankIcon = rankIcons[index]?.icon;
              const rankColor = rankIcons[index]?.color;

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    isCurrentUser 
                      ? 'bg-accent/10 border border-accent/20' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    {RankIcon ? (
                      <RankIcon className={`w-6 h-6 ${rankColor}`} />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback>
                      {entry.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name & Tier */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {entry.full_name || 'Anonymous'}
                      {isCurrentUser && (
                        <span className="text-accent ml-2 text-sm">(You)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`capitalize font-medium ${tierColors[entry.tier as keyof typeof tierColors] || ''}`}>
                        {entry.tier}
                      </span>
                      {entry.streak_days > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="w-3 h-3" />
                          {entry.streak_days}
                        </span>
                      )}
                      {entry.badges_count > 0 && (
                        <span className="text-muted-foreground">
                          {entry.badges_count} badges
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold">{entry.lifetime_points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
