import React, { memo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { History, ArrowRight, ChevronLeft, ChevronRight, RotateCcw, ShoppingCart, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { optimizeImageUrl } from '@/lib/imageOptimization';
import { haptic } from '@/lib/haptics';
import { SPRING } from '@/lib/animations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

// Fetch ACTUAL previously purchased products from the orders table
function usePreviouslyPurchased(userId?: string) {
  return useQuery({
    queryKey: ['previously-purchased', userId],
    queryFn: async () => {
      // Get distinct product IDs from the user's paid orders
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          product_id,
          product_title,
          unit_price,
          quantity,
          orders!inner (customer_id, payment_status, created_at)
        `)
        .eq('orders.customer_id', userId!)
        .in('orders.payment_status', ['paid', 'cod_pending'])
        .order('orders(created_at)', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!orderItems?.length) return [];

      // Deduplicate by product_id, keeping the most recent purchase
      const seen = new Set<string>();
      const uniqueProductIds: string[] = [];
      for (const item of orderItems) {
        if (item.product_id && !seen.has(item.product_id)) {
          seen.add(item.product_id);
          uniqueProductIds.push(item.product_id);
        }
      }

      if (uniqueProductIds.length === 0) return [];

      // Fetch full product details for those product IDs
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select(`
          id, title, slug, price, compare_at_price, stock, avg_rating, review_count,
          product_images (url, is_primary),
          vendors_public (brand_name, slug)
        `)
        .in('id', uniqueProductIds.slice(0, 12))
        .eq('is_active', true);

      if (prodError) throw prodError;

      // Maintain order of purchase (most recent first)
      const productMap = new Map(products?.map(p => [p.id, p]) || []);
      return uniqueProductIds
        .map(id => productMap.get(id))
        .filter(Boolean) as typeof products;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

const PurchasedItem = memo(function PurchasedItem({
  product,
  index,
}: {
  product: any;
  index: number;
}) {
  const { addItem } = useCart();
  const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0];

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);

  const handleReorder = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptic('medium');
    try {
      await addItem(product.id, 1);
      toast.success('Added to cart!', { description: product.title });
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING.stiff, delay: Math.min(index * 0.04, 0.24) }}
      className="flex-shrink-0 w-36 md:w-44"
    >
      <Link to={`/product/${product.slug}`} className="block group/card" onClick={() => haptic('light')}>
        <div className="relative aspect-square bg-card rounded-xl overflow-hidden mb-2 border border-border/30 group-hover/card:border-success/40 transition-colors duration-150">
          <img
            src={optimizeImageUrl(primaryImage?.url || '/placeholder.svg', 'card')}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain p-2 group-hover/card:scale-103 transition-transform duration-200"
          />
          {/* Reorder badge */}
          <div className="absolute top-2 left-2 bg-success/90 text-success-foreground text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
            <RotateCcw className="w-2.5 h-2.5" />
            Purchased
          </div>
          {/* Quick reorder button */}
          <button
            onClick={handleReorder}
            className="absolute bottom-2 right-2 bg-accent text-accent-foreground p-1.5 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity shadow-md hover:scale-110"
            title="Add to cart again"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
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
            <span className="text-xs text-muted-foreground">{product.avg_rating?.toFixed(1)}</span>
          </div>
        )}
      </Link>
    </motion.div>
  );
});

export function PreviouslyPurchased() {
  const { user } = useAuth();
  const { data: products, isLoading } = usePreviouslyPurchased(user?.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      haptic('light');
      scrollRef.current.scrollBy({ left: direction === 'left' ? -280 : 280, behavior: 'smooth' });
    }
  }, []);

  if (!user) return null;
  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="py-4 bg-gradient-to-br from-success/[0.05] to-accent/[0.04] dark:from-success/[0.10] dark:to-accent/[0.06] rounded-2xl mx-4 my-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-foreground">Buy Again</h2>
              <Badge className="bg-success/15 text-success border-success/30 text-xs px-2 py-0.5 gap-1">
                <History className="w-3 h-3" />
                Your Orders
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Reorder your favorites with one tap
            </p>
          </div>
        </div>
        <Link
          to="/customer/orders"
          className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          Order History
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
              <PurchasedItem key={product.id} product={product} index={index} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
