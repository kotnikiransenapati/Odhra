import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold = 80 }: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center pointer-events-none"
      style={{ paddingTop: isRefreshing ? 16 : pullDistance * 0.5 }}
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-lg transition-transform ${progress >= 1 ? 'scale-110' : ''}`}>
        {isRefreshing ? (
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        ) : (
          <motion.div
            animate={{ rotate: progress * 360 }}
            className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent"
          />
        )}
      </div>
    </motion.div>
  );
}
