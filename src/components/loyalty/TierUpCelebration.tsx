import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  Award, 
  Star, 
  Gem, 
  Sparkles,
  PartyPopper
} from 'lucide-react';
import confetti from 'canvas-confetti';

const tierConfig = {
  bronze: {
    icon: Award,
    gradient: 'from-warning/80 to-warning',
    color: 'text-warning',
    name: 'Bronze',
  },
  silver: {
    icon: Star,
    gradient: 'from-muted-foreground/60 to-muted-foreground/80',
    color: 'text-muted-foreground',
    name: 'Silver',
  },
  gold: {
    icon: Crown,
    gradient: 'from-accent to-accent/80',
    color: 'text-accent',
    name: 'Gold',
  },
  platinum: {
    icon: Sparkles,
    gradient: 'from-primary to-primary/80',
    color: 'text-primary',
    name: 'Platinum',
  },
  diamond: {
    icon: Gem,
    gradient: 'from-info to-info/80',
    color: 'text-info',
    name: 'Diamond',
  },
};

interface TierUpCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  newTier: keyof typeof tierConfig;
  previousTier?: string;
}

export function TierUpCelebration({ 
  isOpen, 
  onClose, 
  newTier, 
  previousTier 
}: TierUpCelebrationProps) {
  const config = tierConfig[newTier];
  const TierIcon = config.icon;

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center overflow-hidden">
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Background gradient */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-10`}
              />

              <div className="relative z-10 py-6">
                {/* Icon animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 200, 
                    damping: 15,
                    delay: 0.2 
                  }}
                  className="mx-auto mb-6"
                >
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-2xl`}>
                    <TierIcon className="w-12 h-12 text-primary-foreground" />
                  </div>
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <PartyPopper className="w-6 h-6 text-accent" />
                    <h2 className="text-2xl font-bold">Level Up!</h2>
                    <PartyPopper className="w-6 h-6 text-accent transform scale-x-[-1]" />
                  </div>
                  
                  <p className="text-muted-foreground mb-4">
                    Congratulations! You've reached
                  </p>

                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                  >
                    <span className={`text-4xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                      {config.name} Tier
                    </span>
                  </motion.div>

                  {previousTier && (
                    <p className="text-sm text-muted-foreground mt-4">
                      You've upgraded from <span className="capitalize font-medium">{previousTier}</span>
                    </p>
                  )}
                </motion.div>

                {/* Benefits preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 pt-6 border-t"
                >
                  <p className="text-sm text-muted-foreground mb-3">New benefits unlocked:</p>
                  <div className="flex justify-center gap-6 text-sm">
                    <div className="text-center">
                      <Sparkles className="w-5 h-5 mx-auto mb-1 text-accent" />
                      <span>More Points</span>
                    </div>
                    <div className="text-center">
                      <Star className="w-5 h-5 mx-auto mb-1 text-accent" />
                      <span>Exclusive Deals</span>
                    </div>
                  </div>
                </motion.div>

                <Button 
                  onClick={onClose} 
                  className="mt-6 w-full"
                  size="lg"
                >
                  Continue Shopping
                </Button>
              </div>
            </>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// Hook to detect tier changes
export function useTierUpDetection() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [tierInfo, setTierInfo] = useState<{ newTier: string; previousTier?: string } | null>(null);

  const triggerCelebration = (newTier: string, previousTier?: string) => {
    setTierInfo({ newTier, previousTier });
    setShowCelebration(true);
  };

  const closeCelebration = () => {
    setShowCelebration(false);
    setTierInfo(null);
  };

  return {
    showCelebration,
    tierInfo,
    triggerCelebration,
    closeCelebration,
  };
}
