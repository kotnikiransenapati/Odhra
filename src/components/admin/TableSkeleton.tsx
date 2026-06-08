import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showStats?: boolean;
  statsCount?: number;
}

/**
 * Reusable shimmer skeleton for admin/vendor data tables.
 * Mirrors the visual rhythm of the stats grid + table layout so the
 * transition to real content feels seamless (no layout shift).
 */
export function TableSkeleton({
  rows = 8,
  columns = 7,
  showStats = true,
  statsCount = 7,
}: TableSkeletonProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: statsCount }).map((_, i) => (
            <Card key={i} className="glass">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
      </div>

      {/* Table */}
      <Card className="glass">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex gap-4 pb-2 border-b border-border">
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {/* Body rows */}
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex gap-4 py-2 items-center">
                {Array.from({ length: columns }).map((_, c) => (
                  <Skeleton
                    key={c}
                    className="h-8 flex-1"
                    style={{ animationDelay: `${(r * columns + c) * 30}ms` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
