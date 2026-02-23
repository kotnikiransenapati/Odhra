import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, ThumbsUp, MessageSquare, TrendingUp, Minus, TrendingDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';
import type { Review } from '@/hooks/useReviews';

interface ReviewCardProps {
  review: Review;
}

function SentimentBadge({ rating, content }: { rating: number; content?: string | null }) {
  // Client-side heuristic sentiment (instant, no API call)
  if (!content && !rating) return null;
  
  let sentiment: 'positive' | 'neutral' | 'negative';
  if (rating >= 4) sentiment = 'positive';
  else if (rating >= 3) sentiment = 'neutral';
  else sentiment = 'negative';
  
  const config = {
    positive: { icon: TrendingUp, label: 'Positive', className: 'bg-success/10 text-success border-success/20' },
    neutral: { icon: Minus, label: 'Neutral', className: 'bg-warning/10 text-warning border-warning/20' },
    negative: { icon: TrendingDown, label: 'Critical', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  
  const { icon: Icon, label, className } = config[sentiment];
  
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

export function ReviewCard({ review }: ReviewCardProps) {
  const initials = review.profiles?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="p-6 rounded-xl bg-secondary/30 border border-border/50 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-accent/20 text-accent">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">
                {review.profiles?.full_name || 'Anonymous'}
              </span>
              {review.is_verified_purchase && (
                <Badge variant="secondary" className="gap-1 text-xs bg-success/10 text-success border-success/20">
                  <CheckCircle className="w-3 h-3" />
                  Verified Purchase
                </Badge>
              )}
              <SentimentBadge rating={review.rating} content={review.content} />
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <StarRating rating={review.rating} readonly size="sm" />
      </div>

      {/* Content */}
      <div className="space-y-2">
        {review.title && (
          <h4 className="font-semibold">{review.title}</h4>
        )}
        {review.content && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {review.content}
          </p>
        )}
      </div>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {review.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Review image ${index + 1}`}
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
          ))}
        </div>
      )}

      {/* Helpful */}
      <div className="flex items-center gap-4 pt-2">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <ThumbsUp className="w-4 h-4" />
          Helpful ({review.helpful_count || 0})
        </Button>
      </div>

      {/* Vendor Reply */}
      {review.vendor_reply && (
        <div className="ml-4 pl-4 border-l-2 border-accent/30 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Vendor Response</span>
            {review.vendor_replied_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.vendor_replied_at), { addSuffix: true })}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{review.vendor_reply}</p>
        </div>
      )}
    </div>
  );
}
