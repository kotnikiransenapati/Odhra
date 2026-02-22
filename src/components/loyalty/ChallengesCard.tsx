import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Clock, Gift, CheckCircle, Loader2, Sparkles, Zap } from 'lucide-react';
import { 
  useActiveChallenges, useUserChallenges, useJoinChallenge, useClaimChallengeReward,
  getChallengeTimeRemaining, type LoyaltyChallenge 
} from '@/hooks/useChallenges';
import { useAuth } from '@/contexts/AuthContext';

interface ChallengeItemProps {
  challenge: LoyaltyChallenge;
  userProgress?: { current_progress: number; is_completed: boolean; reward_claimed: boolean; id: string };
  onJoin: () => void;
  onClaim: () => void;
  isJoining: boolean;
  isClaiming: boolean;
}

const typeStyles: Record<string, { badge: string; icon: string }> = {
  daily: { badge: 'bg-info/10 text-info border-info/20', icon: '⚡' },
  weekly: { badge: 'bg-accent/10 text-accent border-accent/20', icon: '🎯' },
  monthly: { badge: 'bg-warning/10 text-warning border-warning/20', icon: '🏆' },
  special: { badge: 'bg-accent/10 text-accent border-accent/20', icon: '✨' },
};

function ChallengeItem({ challenge, userProgress, onJoin, onClaim, isJoining, isClaiming }: ChallengeItemProps) {
  const criteria = challenge.criteria as Record<string, number>;
  const targetCount = criteria.count || criteria.streak || criteria.min_amount || 1;
  const progress = userProgress?.current_progress || 0;
  const progressPercent = Math.min((progress / targetCount) * 100, 100);
  const timeLeft = getChallengeTimeRemaining(challenge.ends_at);
  const style = typeStyles[challenge.challenge_type] || typeStyles.daily;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-border/60 hover:border-accent/30 hover:shadow-sm transition-all bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${style.badge}`}>
              {style.icon} {challenge.challenge_type}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{timeLeft}
            </span>
          </div>
          <h4 className="font-semibold text-sm">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{challenge.description}</p>
          )}
          
          {userProgress && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{progress} / {targetCount}</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1 text-accent font-bold text-sm">
            <Zap className="w-3.5 h-3.5" />+{challenge.points_reward}
          </div>

          {!userProgress ? (
            <Button size="sm" onClick={onJoin} disabled={isJoining} className="h-8 text-xs px-3">
              {isJoining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Join'}
            </Button>
          ) : userProgress.is_completed && !userProgress.reward_claimed ? (
            <Button size="sm" onClick={onClaim} disabled={isClaiming} className="h-8 text-xs px-3 gap-1">
              {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" />Claim</>}
            </Button>
          ) : userProgress.reward_claimed ? (
            <Badge variant="secondary" className="gap-1 text-xs"><CheckCircle className="w-3 h-3" />Done</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">In Progress</Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChallengesCard() {
  const { user } = useAuth();
  const { data: challenges, isLoading: challengesLoading } = useActiveChallenges();
  const { data: userChallenges } = useUserChallenges();
  const joinChallenge = useJoinChallenge();
  const claimReward = useClaimChallengeReward();

  const getUserProgress = (challengeId: string) => {
    return userChallenges?.find(uc => uc.challenge_id === challengeId);
  };

  if (challengesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!challenges?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5 text-accent" />Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6 text-sm">
            No active challenges right now. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-5 h-5 text-accent" />
          Active Challenges
          <Badge variant="secondary" className="ml-auto text-[10px]">{challenges.length} active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {challenges.map(challenge => (
          <ChallengeItem
            key={challenge.id}
            challenge={challenge}
            userProgress={getUserProgress(challenge.id)}
            onJoin={() => joinChallenge.mutate(challenge.id)}
            onClaim={() => {
              const progress = getUserProgress(challenge.id);
              if (progress) claimReward.mutate(progress.id);
            }}
            isJoining={joinChallenge.isPending}
            isClaiming={claimReward.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}
