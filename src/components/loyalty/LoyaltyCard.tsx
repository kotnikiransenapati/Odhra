import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useLoyaltyPoints, getNextTierInfo, TIER_BENEFITS } from '@/hooks/useLoyalty';
import { 
  Crown, 
  Sparkles, 
  Award, 
  Star, 
  Gem,
  ArrowRight,
  Flame 
} from 'lucide-react';

const tierConfig = {
  bronze: {
    icon: Award,
    gradient: 'from-amber-600 to-amber-800',
    color: 'text-amber-600',
  },
  silver: {
    icon: Star,
    gradient: 'from-slate-400 to-slate-600',
    color: 'text-slate-500',
  },
  gold: {
    icon: Crown,
    gradient: 'from-yellow-400 to-yellow-600',
    color: 'text-yellow-500',
  },
  platinum: {
    icon: Sparkles,
    gradient: 'from-purple-400 to-purple-600',
    color: 'text-purple-500',
  },
  diamond: {
    icon: Gem,
    gradient: 'from-cyan-400 to-blue-600',
    color: 'text-cyan-500',
  },
};

interface LoyaltyCardProps {
  compact?: boolean;
  showActions?: boolean;
}

export function LoyaltyCard({ compact = false, showActions = true }: LoyaltyCardProps) {
  const { data: loyalty, isLoading } = useLoyaltyPoints();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className={compact ? 'p-4' : 'p-6'}>
          <div className="h-24 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const tier = loyalty?.tier || 'bronze';
  const points = loyalty?.points || 0;
  const lifetimePoints = loyalty?.lifetime_points || 0;
  const streak = loyalty?.streak_days || 0;
  const config = tierConfig[tier];
  const TierIcon = config.icon;
  const nextTier = getNextTierInfo(tier, lifetimePoints);
  const benefits = TIER_BENEFITS[tier];

  const progressPercentage = nextTier 
    ? ((lifetimePoints - (nextTier.threshold - nextTier.pointsNeeded)) / nextTier.pointsNeeded) * 100
    : 100;

  if (compact) {
    return (
      <Link to="/account/rewards">
        <Card className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br ${config.gradient} text-white border-0`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TierIcon className="w-8 h-8" />
                <div>
                  <p className="font-bold capitalize">{tier} Member</p>
                  <p className="text-sm text-white/80">{points.toLocaleString()} pts</p>
                </div>
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-1 text-white/90">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-medium">{streak}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`overflow-hidden bg-gradient-to-br ${config.gradient} text-white border-0`}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TierIcon className="w-6 h-6" />
                <span className="text-lg font-bold capitalize">{tier} Member</span>
              </div>
              <p className="text-white/80 text-sm">Odhra Rewards Program</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{points.toLocaleString()}</p>
              <p className="text-white/80 text-sm">Available Points</p>
            </div>
          </div>

          {/* Streak indicator */}
          {streak > 0 && (
            <div className="flex items-center gap-2 mb-4 bg-white/10 rounded-lg px-3 py-2 w-fit">
              <Flame className="w-4 h-4 text-orange-300" />
              <span className="text-sm font-medium">{streak} day streak</span>
            </div>
          )}

          {/* Progress to next tier */}
          {nextTier && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Progress to {nextTier.tier}</span>
                <span className="font-medium">{nextTier.pointsNeeded.toLocaleString()} pts to go</span>
              </div>
              <Progress value={progressPercentage} className="h-2 bg-white/20" />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-2xl font-bold">{lifetimePoints.toLocaleString()}</p>
              <p className="text-xs text-white/80">Lifetime Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{benefits.pointsMultiplier}x</p>
              <p className="text-xs text-white/80">Points Multiplier</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {benefits.freeShippingThreshold === 0 ? 'Free' : `₹${benefits.freeShippingThreshold}`}
              </p>
              <p className="text-xs text-white/80">Free Shipping</p>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="mt-6 pt-4 border-t border-white/20">
              <Button 
                asChild 
                variant="secondary" 
                className="w-full bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <Link to="/account/rewards" className="gap-2">
                  View Rewards <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
