import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ShoppingBag, 
  Crown, 
  Heart, 
  Star, 
  Award, 
  Users, 
  Megaphone,
  Sunrise,
  Flame,
  Trophy,
  Bookmark,
  Zap,
  LucideIcon
} from 'lucide-react';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  ShoppingBag,
  Crown,
  Heart,
  Star,
  Award,
  Users,
  Megaphone,
  Sunrise,
  Flame,
  Trophy,
  Bookmark,
  Zap,
};

interface AchievementBadgeProps {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  earnedAt?: string;
  isLocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function AchievementBadge({
  id,
  name,
  description,
  icon,
  earnedAt,
  isLocked = false,
  size = 'md',
  showTooltip = true,
  className,
}: AchievementBadgeProps) {
  const IconComponent = icon ? iconMap[icon] || Award : Award;

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  return (
    <div className={cn('relative group', className)}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        className={cn(
          'rounded-full flex items-center justify-center transition-all',
          sizeClasses[size],
          isLocked 
            ? 'bg-muted text-muted-foreground opacity-50'
            : 'bg-gradient-to-br from-accent to-accent/80 text-accent-foreground shadow-lg'
        )}
      >
        <IconComponent className={iconSizeClasses[size]} />
        {!isLocked && (
          <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
        )}
      </motion.div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="bg-popover text-popover-foreground rounded-lg shadow-lg p-3 text-center min-w-[150px] border">
            <p className="font-semibold text-sm">{name}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {earnedAt && !isLocked && (
              <p className="text-xs text-accent mt-1">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </p>
            )}
            {isLocked && (
              <p className="text-xs text-muted-foreground mt-1">Locked</p>
            )}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-popover" />
        </div>
      )}
    </div>
  );
}

interface AchievementGridProps {
  achievements: Array<{
    id: string;
    badge_id: string;
    earned_at: string;
    badge?: {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
    };
  }>;
  allBadges: Array<{
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
  }>;
  className?: string;
}

export function AchievementGrid({ achievements, allBadges, className }: AchievementGridProps) {
  const earnedBadgeIds = new Set(achievements.map(a => a.badge_id));

  return (
    <div className={cn('grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4', className)}>
      {allBadges.map((badge) => {
        const earned = achievements.find(a => a.badge_id === badge.id);
        
        return (
          <AchievementBadge
            key={badge.id}
            id={badge.id}
            name={badge.name}
            description={badge.description}
            icon={badge.icon}
            earnedAt={earned?.earned_at}
            isLocked={!earned}
            size="md"
          />
        );
      })}
    </div>
  );
}
