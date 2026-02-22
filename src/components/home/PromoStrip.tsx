import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Timer, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromoStripProps {
  message: string;
  link?: string;
  linkText?: string;
  countdownTo?: string | null;
  backgroundColor?: string;
  dismissible?: boolean;
}

function useCountdown(targetDate: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(null);
      return;
    }

    const target = new Date(targetDate).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export function PromoStrip({
  message,
  link,
  linkText = 'Shop Now',
  countdownTo,
  backgroundColor,
  dismissible = true,
}: PromoStripProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const countdown = useCountdown(countdownTo);

  // Don't show if countdown expired
  const hasExpired = countdownTo && !countdown;

  if (isDismissed || hasExpired) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative overflow-hidden"
      >
        <div
          className={`relative py-3 px-4 ${
            backgroundColor || 'bg-gradient-to-r from-accent via-accent/90 to-accent'
          }`}
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  currentColor 10px,
                  currentColor 11px
                )`,
              }}
            />
          </div>

          {/* Floating particles */}
          <motion.div
            className="absolute top-1 left-1/4 w-1 h-1 bg-accent-foreground/30 rounded-full"
            animate={{ y: [0, -10, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-2 right-1/3 w-1.5 h-1.5 bg-accent-foreground/20 rounded-full"
            animate={{ y: [0, -8, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          />

          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 text-accent-foreground relative z-10">
            {/* Icon */}
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-5 h-5" />
            </motion.div>

            {/* Message */}
            <span className="font-semibold text-sm md:text-base tracking-wide">
              {message}
            </span>

            {/* Countdown */}
            {countdown && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-foreground/20 backdrop-blur-sm">
                <Timer className="w-4 h-4" />
                <div className="flex items-center gap-1 font-mono text-sm font-bold">
                  {countdown.days > 0 && (
                    <>
                      <span>{countdown.days}d</span>
                      <span className="opacity-60">:</span>
                    </>
                  )}
                  <span>{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="animate-pulse">:</span>
                  <span>{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="animate-pulse">:</span>
                  <span>{String(countdown.seconds).padStart(2, '0')}</span>
                </div>
              </div>
            )}

            {/* CTA Link */}
            {link && (
              <Link
                to={link}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-background/90 text-accent font-semibold text-sm hover:bg-background transition-colors shadow-sm"
              >
                {linkText}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-accent-foreground/20 transition-colors text-accent-foreground/80 hover:text-accent-foreground"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
