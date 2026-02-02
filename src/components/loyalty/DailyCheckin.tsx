import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLoyaltyPoints, useDailyCheckin } from '@/hooks/useLoyalty';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Gift, 
  Flame, 
  Calendar, 
  Sparkles,
  CheckCircle,
  Loader2 
} from 'lucide-react';

interface DailyCheckinProps {
  variant?: 'banner' | 'card' | 'popup';
  onCheckinComplete?: () => void;
}

export function DailyCheckin({ variant = 'card', onCheckinComplete }: DailyCheckinProps) {
  const { user } = useAuth();
  const { data: loyalty } = useLoyaltyPoints();
  const checkin = useDailyCheckin();

  if (!user) return null;

  const streak = loyalty?.streak_days || 0;
  const lastCheckin = loyalty?.last_checkin_at;
  const today = new Date().toISOString().split('T')[0];
  const lastCheckinDate = lastCheckin 
    ? new Date(lastCheckin).toISOString().split('T')[0]
    : null;
  const alreadyCheckedIn = lastCheckinDate === today;

  // Calculate next streak bonus
  const getNextBonus = (currentStreak: number) => {
    if (currentStreak >= 29) return { days: 30, bonus: 25, remaining: 30 - currentStreak };
    if (currentStreak >= 13) return { days: 14, bonus: 15, remaining: 14 - (currentStreak % 14 || 14) };
    if (currentStreak >= 6) return { days: 7, bonus: 10, remaining: 7 - (currentStreak % 7 || 7) };
    return { days: 7, bonus: 10, remaining: 7 - currentStreak };
  };

  const nextBonus = getNextBonus(streak);

  const handleCheckin = async () => {
    await checkin.mutateAsync();
    onCheckinComplete?.();
  };

  if (variant === 'banner') {
    return (
      <AnimatePresence>
        {!alreadyCheckedIn && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground px-4 py-3"
          >
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5" />
                <span className="font-medium">Daily bonus available!</span>
                {streak > 0 && (
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    <Flame className="w-3 h-3 mr-1" />
                    {streak} day streak
                  </Badge>
                )}
              </div>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={handleCheckin}
                disabled={checkin.isPending}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                {checkin.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Claim Points</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (variant === 'popup') {
    if (alreadyCheckedIn) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-20 right-4 z-40"
      >
        <Card className="w-72 shadow-lg border-accent/20 overflow-hidden">
          <div className="bg-gradient-to-r from-accent to-accent/80 px-4 py-2 text-accent-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium text-sm">Daily Bonus Ready!</span>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Current streak</p>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-bold">{streak} days</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next bonus</p>
                <p className="font-bold text-accent">+{nextBonus.bonus} pts</p>
              </div>
            </div>
            <Button 
              className="w-full gap-2" 
              onClick={handleCheckin}
              disabled={checkin.isPending}
            >
              {checkin.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Claim Today's Points
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Default card variant
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Daily Check-in
            </h3>
            <p className="text-sm text-muted-foreground">
              Check in daily to earn bonus points
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-orange-500/10 text-orange-600 px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4" />
              <span className="font-bold">{streak} day streak</span>
            </div>
          )}
        </div>

        {/* Streak visualization */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {[...Array(7)].map((_, i) => {
            const dayNum = i + 1;
            // Fix: Use modulo to show week cycle, mark days completed based on streak within current week
            const streakInWeek = streak % 7 || (streak > 0 ? 7 : 0);
            const isCompleted = alreadyCheckedIn 
              ? dayNum <= streakInWeek 
              : dayNum < streakInWeek || (streak > 0 && dayNum <= streakInWeek);
            const isCurrent = !alreadyCheckedIn && dayNum === (streakInWeek + 1);
            
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                  isCompleted 
                    ? 'bg-accent text-accent-foreground' 
                    : isCurrent 
                      ? 'bg-accent/20 border-2 border-accent border-dashed'
                      : 'bg-muted'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="font-medium">Day {dayNum}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Points info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Points today</span>
            <span className="font-bold">
              {streak >= 6 ? '+10 pts' : streak >= 13 ? '+15 pts' : '+5 pts'}
            </span>
          </div>
          {!alreadyCheckedIn && nextBonus.remaining > 0 && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">
                {nextBonus.remaining} days to {nextBonus.days}-day bonus
              </span>
              <span className="font-bold text-accent">+{nextBonus.bonus} pts</span>
            </div>
          )}
        </div>

        <Button 
          className="w-full gap-2" 
          onClick={handleCheckin}
          disabled={alreadyCheckedIn || checkin.isPending}
        >
          {checkin.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : alreadyCheckedIn ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Checked In Today
            </>
          ) : (
            <>
              <Gift className="w-4 h-4" />
              Check In & Earn Points
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
