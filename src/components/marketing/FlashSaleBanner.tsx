import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface FlashSale {
  id: string;
  title: string;
  discount: string;
  endsAt: Date;
  link: string;
}

interface FlashSaleBannerProps {
  sale?: FlashSale;
}

const defaultSale: FlashSale = {
  id: '1',
  title: 'Flash Sale',
  discount: 'Up to 50% OFF',
  endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
  link: '/shop?sale=flash',
};

// Banner height constant for layout calculations
export const FLASH_SALE_BANNER_HEIGHT = 48; // px

export function FlashSaleBanner({ sale = defaultSale }: FlashSaleBannerProps) {
  const { isEnabled } = useFeatureFlag('flash_sales');
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = sale.endsAt.getTime() - Date.now();
      
      if (difference <= 0) {
        setIsVisible(false);
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [sale.endsAt]);

  // Update CSS variable for layout calculations
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--banner-height', 
      isVisible ? `${FLASH_SALE_BANNER_HEIGHT}px` : '0px'
    );
    return () => {
      document.documentElement.style.setProperty('--banner-height', '0px');
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="sticky top-0 left-0 right-0 z-[60] bg-gradient-to-r from-accent via-accent/90 to-accent text-accent-foreground overflow-hidden"
        style={{ minHeight: FLASH_SALE_BANNER_HEIGHT }}
      >
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                className="flex-shrink-0"
              >
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </motion.div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 min-w-0">
                <span className="font-bold text-xs sm:text-sm md:text-base truncate">{sale.title}</span>
                <span className="text-xs sm:text-sm font-medium truncate">{sale.discount}</span>
              </div>

              {/* Countdown Timer - Hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2 bg-background/20 rounded-lg px-3 py-1.5 flex-shrink-0">
                <Clock className="w-4 h-4" />
                <div className="flex items-center gap-1 font-mono font-bold text-sm">
                  <TimeUnit value={timeLeft.hours} label="h" />
                  <span>:</span>
                  <TimeUnit value={timeLeft.minutes} label="m" />
                  <span>:</span>
                  <TimeUnit value={timeLeft.seconds} label="s" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="bg-background/20 hover:bg-background/30 text-accent-foreground border-0 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <Link to={sale.link}>Shop Now</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 sm:w-8 sm:h-8 hover:bg-background/20"
                onClick={() => setIsVisible(false)}
                aria-label="Close banner"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="tabular-nums">{value.toString().padStart(2, '0')}</span>
      <span className="text-xs opacity-70">{label}</span>
    </span>
  );
}
