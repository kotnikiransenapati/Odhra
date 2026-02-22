import React, { useMemo } from 'react';
import { Star, ThumbsUp, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ReviewStatsProps {
  average: number;
  total: number;
  distribution: number[];
}

export function ReviewStats({ average, total, distribution }: ReviewStatsProps) {
  const recommendPercent = useMemo(() => {
    const positive = (distribution[3] || 0) + (distribution[4] || 0); // 4 & 5 star
    return total > 0 ? Math.round((positive / total) * 100) : 0;
  }, [distribution, total]);

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6 rounded-xl bg-secondary/30 border border-border/50">
      {/* Average */}
      <div className="flex flex-col items-center justify-center text-center min-w-[160px]">
        <div className="text-5xl font-bold">{average.toFixed(1)}</div>
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'w-5 h-5',
                star <= Math.round(average)
                  ? 'fill-warning text-warning'
                  : 'text-muted-foreground/30'
              )}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Based on {total} review{total !== 1 ? 's' : ''}
        </p>
        
        {/* Recommend percentage */}
        {total >= 3 && recommendPercent >= 70 && (
          <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
            <ThumbsUp className="w-3.5 h-3.5" />
            {recommendPercent}% recommend
          </div>
        )}
      </div>

      {/* Distribution */}
      <div className="flex-1 space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = distribution[stars - 1] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={stars} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-12">
                <span className="text-sm font-medium">{stars}</span>
                <Star className="w-4 h-4 fill-warning text-warning" />
              </div>
              <Progress value={percentage} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground w-10 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
