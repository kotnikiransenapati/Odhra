import React, { memo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight, Heart, Eye, TrendingUp } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { optimizeImageUrl } from '@/lib/imageOptimization';
import { haptic } from '@/lib/haptics';
import { SPRING } from '@/lib/animations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

function usePersonalizedRecommendations(userId?: string) {
  return useQuery({
    queryKey: ['personalized-recommendations', userId],
    queryFn: async () => {
      // Step 1: Get user's purchased category IDs and tags
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, orders!inner(customer_id)')
        .eq('orders.customer_id', userId!)
        .limit(30);

      const purchasedIds = [...new Set(orderItems?.map(o => o.product_id).filter(Boolean) || [])];

      // Step 2: Get categories/tags from purchased products
      let preferredCategories: string[] = [];
      let preferredTags: string[] = [];
      
      if (purchasedIds.length > 0) {
        const { data: purchasedProducts } = await supabase
          .from('products')
          .select('category_id, tags')
          .in('id', purchasedIds.slice(0, 20));

        preferredCategories = [...new Set(purchasedProducts?.map(p => p.category_id).filter(Boolean) || [])] as string[];
        preferredTags = [...new Set(purchasedProducts?.flatMap(p => p.tags || []) || [])];
      }

      // Step 3: Fetch candidate products NOT already purchased
      let query = supabase
        .from('products')
        .select(`
          id, title, slug, price, compare_at_price, stock, avg_rating, review_count, sold_count,
          category_id, tags, is_featured,
          product_images (url, is_primary),
          vendors_public (brand_name, slug)
        `)
        .eq('is_active', true)
        .gt('stock', 0);

      if (purchasedIds.length > 0) {
        query = query.not('id', 'in', `(${purchasedIds.join(',')})`);
      }

      const { data: candidates, error } = await query.limit(60);
      if (error) throw error;
      if (!candidates?.length) return [];

      // Step 4: Score each product based on affinity
      const scored = candidates.map(p => {
        let score = 0;
        // Category match
        if (p.category_id && preferredCategories.includes(p.category_id)) score += 40;
        // Tag overlap
        const tagOverlap = (p.tags || []).filter(t => preferredTags.includes(t)).length;
        score += tagOverlap * 12;
        // Rating boost
        score += Math.min((p.avg_rating || 0) * 5, 25);
        // Popularity boost
        score += Math.min((p.sold_count || 0) / 5, 15);
        // Featured boost
        if (p.is_featured) score += 10;
        // Small random factor for diversity
        score += Math.random() * 8;
        return { ...p, _score: score };
      });

      // Sort by score, return top results
      return scored.sort((a, b) => b._score - a._score).slice(0, 12);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

const RecommendedItem = memo(function RecommendedItem({
  product,
  index,
  isPersonalized,
}: {
  product: any;
  index: number;
  isPersonalized: boolean;
}) {
  const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0];
  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING.stiff, delay: Math.min(index * 0.03, 0.2) }}
      className="flex-shrink-0 w-36 md:w-44"
    >
      <Link to={`/product/${product.slug}`} className="block group/card" onClick={() => haptic('light')}>
        <div className="relative aspect-square bg-card rounded-xl overflow-hidden mb-2 border border-border/30 group-hover/card:border-accent/30 transition-colors duration-150">
          <img
            src={optimizeImageUrl(primaryImage?.url || '/placeholder.svg', 'card')}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain p-2 group-hover/card:scale-103 transition-transform duration-200"
          />
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded">
              {discount}% OFF
            </div>
          )}
          {/* Social proof badges */}
          {product.sold_count > 10 && index < 4 && (
            <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-success" />
              {product.sold_count}+ sold
            </div>
          )}
        </div>
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover/card:text-accent transition-colors duration-150">
          {product.title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-accent">{formatPrice(product.price)}</span>
          {product.compare_at_price && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
          )}
        </div>
        {product.avg_rating > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-warning">★</span>
            <span className="text-xs text-muted-foreground">
              {product.avg_rating?.toFixed(1)}
              {product.review_count > 0 && ` (${product.review_count})`}
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
});

export function RecommendedProducts() {
  const { isEnabled } = useFeatureFlag('product_recommendations');
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!isEnabled) return null;


  // Personalized for logged-in users, popular products fallback for guests
  const personalized = usePersonalizedRecommendations(user?.id);
  const fallback = useProducts({ limit: 12, sortBy: 'popular' });

  const isPersonalized = !!(user && personalized.data?.length);
  const products = isPersonalized ? personalized.data : fallback.data;
  const isLoading = user ? personalized.isLoading : fallback.isLoading;

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      haptic('light');
      scrollRef.current.scrollBy({ left: direction === 'left' ? -280 : 280, behavior: 'smooth' });
    }
  }, []);

  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="py-4 bg-gradient-to-br from-accent/[0.04] to-primary/[0.04] dark:from-accent/[0.08] dark:to-primary/[0.08] rounded-2xl mx-4 my-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-foreground">
                {isPersonalized ? 'Picked For You' : 'You Might Like'}
              </h2>
              <Badge className="bg-accent/10 text-accent border-accent/30 text-xs px-2 py-0.5 gap-1">
                {isPersonalized ? (
                  <>
                    <Sparkles className="w-3 h-3" />
                    For You
                  </>
                ) : (
                  <>
                    <Heart className="w-3 h-3" />
                    Popular
                  </>
                )}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isPersonalized
                ? 'Based on your purchase history & preferences'
                : 'Loved by thousands of customers'}
            </p>
          </div>
        </div>
        <Link
          to="/shop?sort=recommended"
          className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Products Scroll */}
      <div className="relative group">
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden md:flex shadow-lg"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden md:flex shadow-lg"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-36 md:w-44">
                <Skeleton className="aspect-square rounded-xl mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))
          ) : (
            products?.map((product: any, index: number) => (
              <RecommendedItem key={product.id} product={product} index={index} isPersonalized={isPersonalized} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
