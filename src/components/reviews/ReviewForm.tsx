import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { useCreateReview } from '@/hooks/useReviews';
import { toast } from 'sonner';

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const createReview = useCreateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      await createReview.mutateAsync({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
      });

      toast.success('Review submitted! It will appear after moderation.');
      setRating(0);
      setTitle('');
      setContent('');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 rounded-xl bg-secondary/30 border border-border/50">
      <h3 className="text-lg font-semibold">Write a Review</h3>

      <div className="space-y-2">
        <Label>Your Rating *</Label>
        <StarRating rating={rating} onRatingChange={setRating} size="lg" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-title">Title (optional)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-content">Your Review (optional)</Label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts about this product..."
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {content.length}/1000
        </p>
      </div>

      <Button type="submit" disabled={createReview.isPending || rating === 0}>
        {createReview.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Submit Review
      </Button>
    </form>
  );
}
