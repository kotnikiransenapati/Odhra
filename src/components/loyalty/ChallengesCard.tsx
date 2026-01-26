import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Clock, 
  Gift, 
  CheckCircle, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { 
  useActiveChallenges, 
  useUserChallenges, 
  useJoinChallenge,
  useClaimChallengeReward,
  getChallengeTimeRemaining,
  type LoyaltyChallenge 
} from '@/hooks/useChallenges';
import { useAuth } from '@/contexts/AuthContext';

interface ChallengeItemProps {
  challenge: LoyaltyChallenge;
  userProgress?: {
    current_progress: number;
    is_completed: boolean;
    reward_claimed: boolean;
    id: string;
  };
  onJoin: () => void;
  onClaim: () => void;
  isJoining: boolean;
  isClaiming: boolean;
}

function ChallengeItem({ 
  challenge, 
  userProgress, 
  onJoin, 
  onClaim,
  isJoining,
  isClaiming 
}: ChallengeItemProps) {
  const criteria = challenge.criteria as Record<string, number>;
  const targetCount = criteria.count || criteria.streak || criteria.min_amount || 1;
  const progress = userProgress?.current_progress || 0;
  const progressPercent = Math.min((progress / targetCount) * 100, 100);
  const timeLeft = getChallengeTimeRemaining(challenge.ends_at);

  const typeColors = {
    daily: 'bg-blue-500/10 text-blue-600',
    weekly: 'bg-purple-500/10 text-purple-600',
    monthly: 'bg-orange-500/10 text-orange-600',
    special: 'bg-accent/10 text-accent',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border rounded-lg hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={typeColors[challenge.challenge_type]}>
              {challenge.challenge_type}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeLeft}
            </span>
          </div>
          <h4 className="font-semibold">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
          )}
          
          {userProgress && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress} / {targetCount}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </div>

        <div className="text-right flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 text-accent font-bold">
            <Gift className="w-4 h-4" />
            +{challenge.points_reward}
          </div>

          {!userProgress ? (
            <Button size="sm" onClick={onJoin} disabled={isJoining}>
              {isJoining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Join'
              )}
            </Button>
          ) : userProgress.is_completed && !userProgress.reward_claimed ? (
            <Button size="sm" onClick={onClaim} disabled={isClaiming} className="gap-1">
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Claim
                </>
              )}
            </Button>
          ) : userProgress.reward_claimed ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Claimed
            </Badge>
          ) : (
            <Badge variant="outline">In Progress</Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChallengesCard() {
  const { user } = useAuth();
  const { data: challenges, isLoading: challengesLoading } = useActiveChallenges();
  const { data: userChallenges, isLoading: progressLoading } = useUserChallenges();
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
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            No active challenges right now. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          Active Challenges
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
