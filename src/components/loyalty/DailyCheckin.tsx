import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLoyaltyPoints, useDailyCheckin } from '@/hooks/useLoyalty';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Gift, Flame, Calendar, Sparkles, CheckCircle, Loader2, Star
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
  const lastCheckinDate = lastCheckin ? new Date(lastCheckin).toISOString().split('T')[0] : null;
  const alreadyCheckedIn = lastCheckinDate === today;

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
            className="bg-gradient-to-r from-accent to-primary text-accent-foreground px-4 py-3"
          >
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5" />
                <span className="font-medium text-sm">Daily bonus available!</span>
                {streak > 0 && (
                  <Badge variant="secondary" className="bg-accent-foreground/20 text-accent-foreground border-0">
                    <Flame className="w-3 h-3 mr-1" />{streak} day streak
                  </Badge>
                )}
              </div>
              <Button 
                size="sm" variant="secondary"
                onClick={handleCheckin} disabled={checkin.isPending}
                className="bg-accent-foreground/20 hover:bg-accent-foreground/30 text-accent-foreground border-0"
              >
                {checkin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim Points'}
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
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="fixed bottom-20 right-4 z-40">
        <Card className="w-72 shadow-2xl border-accent/20 overflow-hidden">
          <div className="bg-gradient-to-r from-accent to-primary px-4 py-2.5 text-accent-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm">Daily Bonus Ready!</span>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Current streak</p>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-warning" />
                  <span className="font-bold">{streak} days</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Next bonus</p>
                <p className="font-bold text-accent">+{nextBonus.bonus} pts</p>
              </div>
            </div>
            <Button className="w-full gap-2" onClick={handleCheckin} disabled={checkin.isPending}>
              {checkin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4" />Claim Today's Points</>}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Default card variant — enhanced with visual streak tracker
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Daily Check-in
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Check in daily to earn bonus points</p>
          </div>
          {streak > 0 && (
            <Badge className="bg-warning/10 text-warning border-warning/20 gap-1.5 px-3">
              <Flame className="w-3.5 h-3.5" />
              {streak} day streak
            </Badge>
          )}
        </div>

        {/* Enhanced streak visualization */}
        <div className="grid grid-cols-7 gap-2 mb-5">
          {[...Array(7)].map((_, i) => {
            const dayNum = i + 1;
            const streakInWeek = streak % 7 || (streak > 0 ? 7 : 0);
            const isCompleted = alreadyCheckedIn 
              ? dayNum <= streakInWeek 
              : dayNum < streakInWeek || (streak > 0 && dayNum <= streakInWeek);
            const isCurrent = !alreadyCheckedIn && dayNum === (streakInWeek + 1);
            const isMilestone = dayNum === 7;
            
            return (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all ${
                  isCompleted 
                    ? 'bg-accent text-accent-foreground shadow-sm' 
                    : isCurrent 
                      ? 'bg-accent/15 border-2 border-accent border-dashed'
                      : 'bg-muted/60'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isMilestone ? (
                  <Star className="w-3.5 h-3.5 text-muted-foreground/50" />
                ) : (
                  <span className="font-medium text-[10px] text-muted-foreground">{dayNum}</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Points info */}
        <div className="rounded-xl bg-muted/40 p-3.5 mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Points today</span>
            <span className="font-bold text-accent">
              +{streak >= 30 ? 25 : streak >= 14 ? 15 : streak >= 7 ? 10 : 5} pts
            </span>
          </div>
          {!alreadyCheckedIn && nextBonus.remaining > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {nextBonus.remaining} days to {nextBonus.days}-day bonus
              </span>
              <span className="font-semibold text-accent">+{nextBonus.bonus} pts</span>
            </div>
          )}
        </div>

        <Button className="w-full gap-2" onClick={handleCheckin} disabled={alreadyCheckedIn || checkin.isPending}>
          {checkin.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : alreadyCheckedIn ? (
            <><CheckCircle className="w-4 h-4" />Checked In Today</>
          ) : (
            <><Gift className="w-4 h-4" />Check In & Earn Points</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
