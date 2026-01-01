import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className={cn('rounded-full border-2 border-accent/20', sizeClasses[size])}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner spinner */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full border-2 border-transparent border-t-accent',
            sizeClasses[size]
          )}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// Page-level loading
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Skeleton components for loading states
export function ProductCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 bg-muted rounded shimmer" />
        <div className="h-4 w-full bg-muted rounded shimmer" />
        <div className="h-4 w-3/4 bg-muted rounded shimmer" />
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-muted rounded shimmer" />
          <div className="h-6 w-14 bg-muted rounded shimmer" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="aspect-[4/3] rounded-2xl bg-muted shimmer animate-pulse" />
  );
}

export function BannerSkeleton() {
  return (
    <div className="h-[500px] md:h-[600px] bg-muted shimmer animate-pulse rounded-b-3xl" />
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-muted shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 bg-muted rounded shimmer" />
        <div className="h-3 w-1/4 bg-muted rounded shimmer" />
      </div>
      <div className="h-8 w-20 bg-muted rounded shimmer" />
    </div>
  );
}

// Inline loading dot animation
export function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}
