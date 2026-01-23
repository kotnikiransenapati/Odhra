import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewMode, getGridClasses } from '@/hooks/useViewMode';

export function ProductCardSkeleton() {
  return (
    <div className="group relative">
      {/* Image skeleton */}
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      
      {/* Content skeleton */}
      <div className="mt-4 space-y-2">
        {/* Brand */}
        <Skeleton className="h-3 w-16" />
        
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        
        {/* Rating */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-8" />
        </div>
        
        {/* Price */}
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

export function ProductCompactSkeleton() {
  return (
    <div className="group relative">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function ProductListSkeleton() {
  return (
    <div className="flex gap-4 p-3 rounded-xl bg-secondary/30">
      <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
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
