import React, { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ReviewCard } from './ReviewCard';
import { ReviewForm } from './ReviewForm';
import { ReviewStats } from './ReviewStats';
import { useProductReviews, useReviewStats, useCanReview } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const { data: reviews, isLoading: reviewsLoading } = useProductReviews(productId);
  const { data: stats, isLoading: statsLoading } = useReviewStats(productId);
  const { data: canReviewData } = useCanReview(productId);

  const isLoading = reviewsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const hasReviews = reviews && reviews.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-accent" />
          Customer Reviews
        </h2>
        {user && canReviewData?.canReview && !showForm && (
          <Button onClick={() => setShowForm(true)}>Write a Review</Button>
        )}
      </div>

      {/* Stats */}
      {hasReviews && stats && (
        <ReviewStats
          average={stats.average}
          total={stats.total}
          distribution={stats.distribution}
        />
      )}

      {/* Review Form */}
      {showForm && (
        <ReviewForm
          productId={productId}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {/* Login prompt */}
      {!user && (
        <div className="p-6 rounded-xl bg-secondary/30 border border-border/50 text-center">
          <p className="text-muted-foreground mb-4">
            Please sign in to write a review
          </p>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      )}

      {/* Already reviewed message */}
      {user && canReviewData?.hasReviewed && !showForm && (
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-center">
          <p className="text-sm text-muted-foreground">
            You have already reviewed this product. Your review is pending moderation.
          </p>
        </div>
      )}

      {/* Need to purchase message */}
      {user && !canReviewData?.hasPurchased && !canReviewData?.hasReviewed && (
        <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            Purchase and pay for this product to leave a verified review
          </p>
        </div>
      )}

      <Separator />

      {/* Reviews List */}
      {hasReviews ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
          <p className="text-muted-foreground">
            Be the first to review this product
          </p>
        </div>
      )}
    </div>
  );
}
