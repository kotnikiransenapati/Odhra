import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function FlashSaleBanner({ sale = defaultSale }: FlashSaleBannerProps) {
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

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-accent via-accent/90 to-accent text-accent-foreground overflow-hidden"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              >
                <Zap className="w-5 h-5 fill-current" />
              </motion.div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span className="font-bold text-sm sm:text-base">{sale.title}</span>
                <span className="text-sm font-medium">{sale.discount}</span>
              </div>

              {/* Countdown Timer */}
              <div className="hidden md:flex items-center gap-2 bg-background/20 rounded-lg px-3 py-1.5">
                <Clock className="w-4 h-4" />
                <div className="flex items-center gap-1 font-mono font-bold">
                  <TimeUnit value={timeLeft.hours} label="h" />
                  <span>:</span>
                  <TimeUnit value={timeLeft.minutes} label="m" />
                  <span>:</span>
                  <TimeUnit value={timeLeft.seconds} label="s" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="bg-background/20 hover:bg-background/30 text-accent-foreground border-0"
              >
                <Link to={sale.link}>Shop Now</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 hover:bg-background/20"
                onClick={() => setIsVisible(false)}
              >
                <X className="w-4 h-4" />
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
