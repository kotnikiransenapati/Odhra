import React, { useState } from 'react';
import { Loader2, Camera, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { ReviewImageUpload } from './ReviewImageUpload';
import { useCreateReview } from '@/hooks/useReviews';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { checkClientRateLimit } from '@/lib/rateLimiter';

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const createReview = useCreateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!checkClientRateLimit('review-submit', 3, 300_000)) {
      toast.error('Too many reviews submitted. Please wait a few minutes.');
      return;
    }

    try {
      await createReview.mutateAsync({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
        images: images.length > 0 ? images : undefined,
      });

      const points = 25 + (images.length > 0 ? 50 : 0);
      toast.success(`Review submitted! You earned ${points} points 🎉`);
      setRating(0);
      setTitle('');
      setContent('');
      setImages([]);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 rounded-xl bg-secondary/30 border border-border/50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Write a Review</h3>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold"
        >
          <Award className="w-3.5 h-3.5" />
          Earn 25+ Points
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

      {/* Photo Upload */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Add Photos
          </Label>
          {images.length === 0 && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">+50 bonus pts</span>
          )}
        </div>
        <ReviewImageUpload images={images} onChange={setImages} />
      </div>

      <Button type="submit" disabled={createReview.isPending || rating === 0} className="gap-2">
        {createReview.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Review & Earn Points
      </Button>
    </form>
  );
}
