import React, { useState } from 'react';
import { Loader2, Camera, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { useCreateReview } from '@/hooks/useReviews';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

      toast.success('Review submitted! You earned 25 points 🎉');
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Write a Review</h3>
        {/* Psychology: Review incentive badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold"
        >
          <Award className="w-3.5 h-3.5" />
          Earn 25 Points
        </motion.div>
      </div>

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

      {/* Psychology: Photo incentive */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="p-2 rounded-lg bg-primary/10">
          <Camera className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Add a photo for +50 bonus points!</p>
          <p className="text-xs text-muted-foreground">Photo reviews help other shoppers</p>
        </div>
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">+50 pts</span>
      </div>

      <Button type="submit" disabled={createReview.isPending || rating === 0} className="gap-2">
        {createReview.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Review & Earn Points
      </Button>
    </form>
  );
}
