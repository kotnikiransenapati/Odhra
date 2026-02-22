import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showValue?: boolean;
}

export function StarRating({
  rating,
  onRatingChange,
  size = 'md',
  readonly = false,
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className={cn(
            'transition-colors',
            !readonly && 'cursor-pointer hover:scale-110 transition-transform'
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= displayRating
                ? 'fill-accent text-accent'
                : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
      {showValue && rating > 0 && (
        <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
