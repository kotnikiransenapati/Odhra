import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Flame, Users, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type UrgencyType = 'lowStock' | 'selling' | 'viewers' | 'trending' | 'flash';

interface UrgencyBadgeProps {
  type: UrgencyType;
  value?: number;
  className?: string;
}

const urgencyConfig = {
  lowStock: {
    icon: Flame,
    getText: (v: number) => `Only ${v} left!`,
    bgClass: 'bg-destructive/10 text-destructive border-destructive/20',
    pulse: true,
  },
  selling: {
    icon: TrendingUp,
    getText: (v: number) => `${v} sold today`,
    bgClass: 'bg-warning/10 text-warning border-warning/20',
    pulse: false,
  },
  viewers: {
    icon: Users,
    getText: (v: number) => `${v} viewing now`,
    bgClass: 'bg-info/10 text-info border-info/20',
    pulse: true,
  },
  trending: {
    icon: Flame,
    getText: () => 'Hot Item',
    bgClass: 'bg-accent/10 text-accent border-accent/20',
    pulse: false,
  },
  flash: {
    icon: Zap,
    getText: () => 'Flash Deal',
    bgClass: 'bg-warning/10 text-warning border-warning/20',
    pulse: true,
  },
};

export function UrgencyBadge({ type, value = 0, className }: UrgencyBadgeProps) {
  const config = urgencyConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        config.bgClass,
        config.pulse && 'animate-pulse',
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{config.getText(value)}</span>
    </motion.div>
  );
}

// Social proof component for product pages
interface SocialProofProps {
  soldCount?: number;
  viewerCount?: number;
  stock?: number;
  className?: string;
}

export function SocialProofIndicators({ soldCount, viewerCount, stock, className }: SocialProofProps) {
  const indicators = [];

  // Low stock warning (scarcity principle)
  if (stock !== undefined && stock > 0 && stock <= 10) {
    indicators.push(
      <UrgencyBadge key="stock" type="lowStock" value={stock} />
    );
  }

  // Viewer count (social proof)
  if (viewerCount && viewerCount > 5) {
    indicators.push(
      <UrgencyBadge key="viewers" type="viewers" value={viewerCount} />
    );
  }

  // Sales count (popularity)
  if (soldCount && soldCount > 20) {
    indicators.push(
      <UrgencyBadge key="sold" type="selling" value={soldCount} />
    );
  }

  if (indicators.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {indicators}
    </div>
  );
}

// Countdown timer for urgency
interface CountdownTimerProps {
  endTime: Date;
  label?: string;
  className?: string;
}

export function CountdownTimer({ endTime, label = 'Offer ends in', className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState({ hours: 0, minutes: 0, seconds: 0 });

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = endTime.getTime();
      const distance = end - now;

      if (distance <= 0) {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className="w-4 h-4 text-destructive" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded font-mono font-bold text-sm">
          {pad(timeLeft.hours)}
        </span>
        <span className="text-destructive font-bold">:</span>
        <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded font-mono font-bold text-sm">
          {pad(timeLeft.minutes)}
        </span>
        <span className="text-destructive font-bold">:</span>
        <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded font-mono font-bold text-sm">
          {pad(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
}
