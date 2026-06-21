import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingBag, Award, ThumbsUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface ProductSocialProofProps {
  productId: string;
  reviewCount: number;
  avgRating: number;
}

export function ProductSocialProof({ productId, reviewCount, avgRating }: ProductSocialProofProps) {
  const { isEnabled } = useFeatureFlag('social_proof_badges');

  const { data: stats } = useQuery({
    queryKey: ['product-social-proof', productId],
    queryFn: async () => {
      const { count: orderCount, error: orderCountError } = await supabase
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (orderCountError) {
        console.warn('[ProductSocialProof] order count unavailable', orderCountError);
      }

      // Get count of positive reviews (4+ stars)
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('is_approved', true);

      const totalReviews = reviews?.length || 0;
      const positiveReviews = reviews?.filter(r => r.rating >= 4).length || 0;
      const recommendPercent = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0;

      return {
        soldCount: orderCountError ? 0 : orderCount || 0,
        recommendPercent,
        totalReviews,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: isEnabled,
  });

  if (!isEnabled) return null;
  if (!stats || (stats.soldCount === 0 && stats.totalReviews === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-3"
    >
      {stats.soldCount > 10 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-xs font-medium">
          <ShoppingBag className="w-3 h-3 text-accent" />
          <span>{stats.soldCount.toLocaleString()}+ sold</span>
        </div>
      )}
      {stats.recommendPercent >= 80 && stats.totalReviews >= 5 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-xs font-medium text-success">
          <ThumbsUp className="w-3 h-3" />
          <span>{stats.recommendPercent}% recommend</span>
        </div>
      )}
      {avgRating >= 4.5 && reviewCount >= 10 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-xs font-medium text-warning">
          <Award className="w-3 h-3" />
          <span>Top Rated</span>
        </div>
      )}
      {stats.soldCount > 100 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-info/10 text-xs font-medium text-info">
          <TrendingUp className="w-3 h-3" />
          <span>Best Seller</span>
        </div>
      )}
    </motion.div>
  );
}
