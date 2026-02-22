import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ShoppingBag, Crown, Heart, Star, Award, Users, Megaphone,
  Sunrise, Flame, Trophy, Bookmark, Zap, LucideIcon, Lock
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag, Crown, Heart, Star, Award, Users, Megaphone,
  Sunrise, Flame, Trophy, Bookmark, Zap,
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
  id, name, description, icon, earnedAt, isLocked = false, size = 'md', showTooltip = true, className,
}: AchievementBadgeProps) {
  const IconComponent = icon ? iconMap[icon] || Award : Award;

  const sizeClasses = { sm: 'w-12 h-12', md: 'w-16 h-16', lg: 'w-24 h-24' };
  const iconSizeClasses = { sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-10 h-10' };

  return (
    <div className={cn('relative group', className)}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1, rotate: isLocked ? 0 : 5 }}
        className={cn(
          'rounded-2xl flex items-center justify-center transition-all relative overflow-hidden',
          sizeClasses[size],
          isLocked 
            ? 'bg-muted text-muted-foreground/40'
            : 'bg-gradient-to-br from-accent to-primary text-accent-foreground shadow-lg shadow-accent/20'
        )}
      >
        {isLocked ? (
          <Lock className={cn(iconSizeClasses[size], 'opacity-50')} />
        ) : (
          <>
            <IconComponent className={cn(iconSizeClasses[size], 'relative z-10')} />
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}
      </motion.div>

      {/* Name below badge */}
      <p className={cn(
        'text-center mt-1.5 font-medium leading-tight',
        size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs',
        isLocked ? 'text-muted-foreground/50' : 'text-foreground'
      )}>
        {name}
      </p>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
          <div className="bg-popover text-popover-foreground rounded-xl shadow-lg p-3 text-center min-w-[140px] border">
            <p className="font-semibold text-xs">{name}</p>
            {description && <p className="text-[10px] text-muted-foreground mt-1">{description}</p>}
            {earnedAt && !isLocked && (
              <p className="text-[10px] text-accent mt-1 font-medium">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </p>
            )}
            {isLocked && <p className="text-[10px] text-muted-foreground mt-1">🔒 Locked</p>}
          </div>
        </div>
      )}
    </div>
  );
}

interface AchievementGridProps {
  achievements: Array<{
    id: string; badge_id: string; earned_at: string;
    badge?: { id: string; name: string; description: string | null; icon: string | null };
  }>;
  allBadges: Array<{ id: string; name: string; description: string | null; icon: string | null }>;
  className?: string;
}

export function AchievementGrid({ achievements, allBadges, className }: AchievementGridProps) {
  return (
    <div className={cn('grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4', className)}>
      {allBadges.map((badge, i) => {
        const earned = achievements.find(a => a.badge_id === badge.id);
        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <AchievementBadge
              id={badge.id}
              name={badge.name}
              description={badge.description}
              icon={badge.icon}
              earnedAt={earned?.earned_at}
              isLocked={!earned}
              size="md"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
