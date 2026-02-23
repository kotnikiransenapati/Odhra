import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SkeletonCardProps {
  className?: string;
  variant?: 'product' | 'category' | 'banner' | 'text';
}

const shimmer = {
  initial: { opacity: 0.4 },
  animate: { opacity: [0.4, 0.7, 0.4] },
  transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const },
};

function AnimatedSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('bg-muted rounded', className)}
      initial={shimmer.initial}
      animate={shimmer.animate}
      transition={shimmer.transition}
    />
  );
}

export function SkeletonCard({ className, variant = 'product' }: SkeletonCardProps) {
  if (variant === 'product') {
    return (
      <motion.div 
        className={cn('rounded-xl overflow-hidden bg-card border border-border/30', className)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <AnimatedSkeleton className="aspect-[3/4] rounded-none" />
        <div className="p-4 space-y-3">
          <AnimatedSkeleton className="h-3 w-16" />
          <AnimatedSkeleton className="h-4 w-3/4" />
          <AnimatedSkeleton className="h-3 w-1/2" />
          <div className="flex justify-between items-center pt-1">
            <AnimatedSkeleton className="h-5 w-20" />
            <AnimatedSkeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'category') {
    return (
      <motion.div 
        className={cn('flex flex-col items-center gap-2', className)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatedSkeleton className="w-16 h-16 rounded-full" />
        <AnimatedSkeleton className="h-3 w-12 rounded" />
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatedSkeleton className={cn('aspect-[21/9] rounded-2xl', className)} />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={cn('space-y-2', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <AnimatedSkeleton className="h-4 w-full" />
      <AnimatedSkeleton className="h-4 w-3/4" />
      <AnimatedSkeleton className="h-4 w-1/2" />
    </motion.div>
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
