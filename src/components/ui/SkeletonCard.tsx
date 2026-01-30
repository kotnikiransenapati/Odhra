import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  variant?: 'product' | 'category' | 'banner' | 'text';
}

export function SkeletonCard({ className, variant = 'product' }: SkeletonCardProps) {
  if (variant === 'product') {
    return (
      <div className={cn('rounded-xl overflow-hidden bg-card', className)}>
        <div className="aspect-square bg-muted animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          <div className="flex justify-between items-center">
            <div className="h-5 bg-muted rounded animate-pulse w-20" />
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category') {
    return (
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
        <div className="h-3 bg-muted rounded animate-pulse w-12" />
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={cn('aspect-[21/9] rounded-2xl bg-muted animate-pulse', className)} />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="h-4 bg-muted rounded animate-pulse w-full" />
      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
      <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant="product" />
      ))}
    </div>
  );
}

export function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto py-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant="category" />
      ))}
    </div>
  );
}
