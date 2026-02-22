import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLoyaltyPoints, getNextTierInfo, TIER_BENEFITS } from '@/hooks/useLoyalty';
import { 
  Crown, Sparkles, Award, Star, Gem, ArrowRight, Flame, Zap
} from 'lucide-react';

const tierConfig = {
  bronze: { icon: Award, gradient: 'from-accent/70 via-accent/60 to-accent/80', accent: 'text-accent', bg: 'bg-accent/10' },
  silver: { icon: Star, gradient: 'from-muted-foreground/50 via-muted-foreground/40 to-muted-foreground/60', accent: 'text-muted-foreground', bg: 'bg-muted' },
  gold: { icon: Crown, gradient: 'from-accent via-accent/90 to-accent/80', accent: 'text-accent', bg: 'bg-accent/10' },
  platinum: { icon: Sparkles, gradient: 'from-primary via-primary/90 to-primary/80', accent: 'text-primary-foreground', bg: 'bg-primary/10' },
  diamond: { icon: Gem, gradient: 'from-info via-info/90 to-primary', accent: 'text-info', bg: 'bg-info/10' },
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
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.bronze;
  const TierIcon = config.icon;
  const nextTier = getNextTierInfo(tier, lifetimePoints);
  const benefits = TIER_BENEFITS[tier as keyof typeof TIER_BENEFITS] || TIER_BENEFITS.bronze;

  const progressPercentage = nextTier 
    ? Math.min(((lifetimePoints - (nextTier.threshold - nextTier.pointsNeeded)) / nextTier.pointsNeeded) * 100, 100)
    : 100;

  if (compact) {
    return (
      <Link to="/account/rewards">
        <Card className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer bg-gradient-to-r ${config.gradient} text-primary-foreground border-0`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center">
                  <TierIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold capitalize text-sm">{tier} Member</p>
                  <p className="text-xs text-primary-foreground/70">{points.toLocaleString()} pts</p>
                </div>
              </div>
              {streak > 0 && (
                <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground border-0 gap-1">
                  <Flame className="w-3 h-3" />
                  {streak}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`overflow-hidden bg-gradient-to-br ${config.gradient} text-primary-foreground border-0 relative`}>
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        </div>
        <CardContent className="p-6 relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center">
                <TierIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-lg font-bold capitalize">{tier} Member</span>
                <p className="text-primary-foreground/60 text-xs">Odhra Rewards</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tracking-tight">{points.toLocaleString()}</p>
              <p className="text-primary-foreground/60 text-xs">Available Points</p>
            </div>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div className="flex items-center gap-2 mb-5">
              <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-0 backdrop-blur-sm gap-1.5 px-3 py-1">
                <Flame className="w-3.5 h-3.5 text-accent" />
                {streak} day streak
              </Badge>
              {benefits.pointsMultiplier > 1 && (
                <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-0 backdrop-blur-sm gap-1">
                  <Zap className="w-3 h-3" />
                  {benefits.pointsMultiplier}x multiplier
                </Badge>
              )}
            </div>
          )}

          {/* Progress */}
          {nextTier && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-primary-foreground/60">Progress to <span className="capitalize font-medium text-primary-foreground/80">{nextTier.tier}</span></span>
                <span className="font-medium">{nextTier.pointsNeeded.toLocaleString()} pts to go</span>
              </div>
              <div className="relative">
                <Progress value={progressPercentage} className="h-2 bg-primary-foreground/15" />
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-primary-foreground/15">
            {[
              { label: 'Lifetime', value: lifetimePoints.toLocaleString() },
              { label: 'Multiplier', value: `${benefits.pointsMultiplier}x` },
              { label: 'Free Ship', value: benefits.freeShippingThreshold === 0 ? 'Free' : `₹${benefits.freeShippingThreshold}` },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-primary-foreground/50 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          {showActions && (
            <div className="mt-5">
              <Button asChild variant="secondary" className="w-full bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-0 backdrop-blur-sm">
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
