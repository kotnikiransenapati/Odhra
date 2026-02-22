import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Crown, Flame, TrendingUp } from 'lucide-react';
import { useLeaderboard, useUserRank } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';

const tierColors: Record<string, string> = {
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  platinum: 'text-purple-500',
  diamond: 'text-cyan-500',
};

const rankConfig = [
  { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/10', ring: 'ring-yellow-500/30' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-400/10', ring: 'ring-slate-400/30' },
  { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-600/10', ring: 'ring-amber-600/30' },
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
          {userRank && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <TrendingUp className="w-3 h-3" />
              Your Rank: #{userRank.rank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!leaderboard?.length ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            No rankings yet. Be the first to earn points!
          </p>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = user?.id === entry.user_id;
              const rank = rankConfig[index];
              const RankIcon = rank?.icon;

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    isCurrentUser 
                      ? 'bg-accent/10 border border-accent/20' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rank ? rank.bg : 'bg-muted/50'}`}>
                    {RankIcon ? (
                      <RankIcon className={`w-4.5 h-4.5 ${rank.color}`} />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className={`h-9 w-9 ${rank ? `ring-2 ${rank.ring}` : ''}`}>
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="text-xs font-semibold">
                      {entry.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {entry.full_name || 'Anonymous'}
                      {isCurrentUser && <span className="text-accent ml-1.5 text-xs font-semibold">(You)</span>}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`capitalize font-medium ${tierColors[entry.tier] || ''}`}>
                        {entry.tier}
                      </span>
                      {entry.streak_days > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-500">
                          <Flame className="w-3 h-3" />{entry.streak_days}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold text-sm">{entry.lifetime_points.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">points</p>
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
