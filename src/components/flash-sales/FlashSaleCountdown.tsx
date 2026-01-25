import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap } from 'lucide-react';

interface FlashSaleCountdownProps {
  endTime: string;
  onExpired?: () => void;
  variant?: 'default' | 'compact' | 'banner';
}

export function FlashSaleCountdown({ endTime, onExpired, variant = 'default' }: FlashSaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setIsExpired(true);
        onExpired?.();
        return;
      }

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpired]);

  if (isExpired) {
    return (
      <div className="text-destructive font-medium flex items-center gap-1">
        <Clock className="h-4 w-4" />
        Sale Ended
      </div>
    );
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className={`
          font-bold tabular-nums
          ${variant === 'banner' ? 'text-2xl md:text-4xl' : 'text-lg md:text-xl'}
          ${variant === 'compact' ? 'text-sm' : ''}
        `}
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <span className={`text-muted-foreground uppercase ${variant === 'compact' ? 'text-[10px]' : 'text-xs'}`}>
        {label}
      </span>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 text-sm font-mono">
        <Clock className="h-3 w-3 text-destructive" />
        <span className="text-destructive font-medium">
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className={`
      flex items-center gap-3 md:gap-4
      ${variant === 'banner' ? 'bg-destructive/10 rounded-xl p-4 md:p-6' : ''}
    `}>
      {variant === 'banner' && (
        <Zap className="h-8 w-8 text-destructive animate-pulse" />
      )}
      <div className="flex items-center gap-2 md:gap-3">
        <TimeBlock value={timeLeft.hours} label="hrs" />
        <span className={`font-bold text-muted-foreground ${variant === 'banner' ? 'text-2xl' : 'text-lg'}`}>:</span>
        <TimeBlock value={timeLeft.minutes} label="min" />
        <span className={`font-bold text-muted-foreground ${variant === 'banner' ? 'text-2xl' : 'text-lg'}`}>:</span>
        <TimeBlock value={timeLeft.seconds} label="sec" />
      </div>
    </div>
  );
}
