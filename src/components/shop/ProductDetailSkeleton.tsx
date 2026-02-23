import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Navbar } from '@/components/layout/Navbar';

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image gallery skeleton */}
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <div className="flex gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="w-20 h-20 rounded-xl shrink-0" />
                ))}
              </div>
            </div>

            {/* Product info skeleton */}
            <div className="space-y-6">
              {/* Vendor */}
              <div className="flex items-center gap-2">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>

              {/* Price */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              {/* Delivery info */}
              <Skeleton className="h-14 w-full rounded-xl" />

              {/* Variant selector */}
              <div className="space-y-3">
                <Skeleton className="h-5 w-16" />
                <div className="flex gap-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-16 rounded-lg" />
                  ))}
                </div>
              </div>

              {/* Quantity + buttons */}
              <div className="space-y-4">
                <Skeleton className="h-12 w-32 rounded-xl" />
                <div className="flex gap-3">
                  <Skeleton className="h-14 flex-1 rounded-xl" />
                  <Skeleton className="h-14 flex-1 rounded-xl" />
                </div>
              </div>

              {/* Trust signals */}
              <div className="flex gap-6">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
