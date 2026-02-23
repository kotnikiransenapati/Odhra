import React from 'react';
import { motion } from 'framer-motion';
import { ViewMode, getGridClasses } from '@/hooks/useViewMode';

const shimmer = {
  animate: { opacity: [0.4, 0.7, 0.4] },
  transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const },
};

function Skel({ className }: { className?: string }) {
  return <motion.div className={`bg-muted rounded ${className || ''}`} animate={shimmer.animate} transition={shimmer.transition} />;
}

export function ProductCardSkeleton() {
  return (
    <motion.div 
      className="group relative rounded-2xl overflow-hidden border border-border/30 bg-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Skel className="aspect-[3/4] w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skel className="h-3 w-16" />
        <Skel className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skel className="h-4 w-20 rounded-full" />
          <Skel className="h-4 w-8" />
        </div>
        <Skel className="h-6 w-24" />
      </div>
    </motion.div>
  );
}

export function ProductCompactSkeleton() {
  return (
    <motion.div 
      className="group relative rounded-xl overflow-hidden border border-border/30 bg-card"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Skel className="aspect-square w-full rounded-none" />
      <div className="p-2.5 space-y-1.5">
        <Skel className="h-7 w-full" />
        <Skel className="h-3 w-12" />
        <Skel className="h-4 w-16" />
      </div>
    </motion.div>
  );
}

export function ProductListSkeleton() {
  return (
    <motion.div 
      className="flex gap-4 p-3 rounded-xl bg-card border border-border/30"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Skel className="w-24 h-24 md:w-32 md:h-32 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skel className="h-3 w-20" />
        <Skel className="h-5 w-3/4" />
        <Skel className="h-4 w-24 rounded-full" />
        <Skel className="h-6 w-20" />
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <Skel className="w-8 h-8 rounded-lg" />
        <Skel className="w-8 h-8 rounded-lg" />
        <Skel className="w-8 h-8 rounded-lg" />
      </div>
    </motion.div>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
  viewMode?: ViewMode;
}

export function ProductGridSkeleton({ count = 8, viewMode = 'grid' }: ProductGridSkeletonProps) {
  const gridClasses = getGridClasses(viewMode);
  
  return (
    <div className={`grid gap-4 md:gap-6 ${gridClasses}`}>
      {Array.from({ length: count }).map((_, i) => {
        switch (viewMode) {
          case 'compact':
            return <ProductCompactSkeleton key={i} />;
          case 'list':
            return <ProductListSkeleton key={i} />;
          default:
            return <ProductCardSkeleton key={i} />;
        }
      })}
    </div>
  );
}
