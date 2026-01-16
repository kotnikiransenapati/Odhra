import { Skeleton } from '@/components/ui/skeleton';

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

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
