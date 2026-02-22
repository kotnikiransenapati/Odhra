import React, { memo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Zap, Timer } from 'lucide-react';
import { useDealsProducts } from '@/hooks/useHomepageCarousels';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { optimizeImageUrl } from '@/lib/imageOptimization';
import { haptic } from '@/lib/haptics';
import { SPRING } from '@/lib/animations';

interface DealsCarouselProps {
  title?: string;
  subtitle?: string;
  limit?: number;
}

function DealsCarouselComponent({ 
  title = "Today's Deals",
  subtitle = "Limited time offers",
  limit = 10 
}: DealsCarouselProps) {
  const { data: products, isLoading } = useDealsProducts(limit);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      haptic('light');
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  // Don't render if no deals available
  if (!isLoading && (!products || products.length === 0)) {
    return null;
  }

  return (
    <section className="py-4 bg-gradient-to-r from-destructive/5 via-warning/5 to-accent/5 dark:from-destructive/10 dark:via-warning/10 dark:to-accent/10 rounded-2xl mx-4 my-3 overflow-hidden border border-destructive/20 dark:border-destructive/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive text-destructive-foreground animate-pulse">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
              <Badge className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 gap-1">
                <Timer className="w-3 h-3" />
                Limited Time
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Link 
          to="/shop?filter=deals"
          className="flex items-center gap-1 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
        >
          View All Deals
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Products Scroll */}
      <div className="relative group">
        {/* Scroll buttons */}
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
            products?.map((product, index) => {
              const primaryImage = product.product_images?.find(img => img.is_primary);
              const discount = product.compare_at_price 
                ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
                : 0;
              const savings = product.compare_at_price 
                ? product.compare_at_price - product.price 
                : 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING.stiff, delay: Math.min(index * 0.03, 0.2) }}
                  className="flex-shrink-0 w-36 md:w-44"
                >
                  <Link 
                    to={`/product/${product.slug}`}
                    className="block group/card"
                    onClick={() => haptic('light')}
                  >
                    <div className="relative aspect-square bg-card rounded-xl overflow-hidden mb-2 border-2 border-destructive/20 dark:border-destructive/30 group-hover/card:border-destructive/50 transition-colors duration-150">
                      <img
                        src={optimizeImageUrl(primaryImage?.url || '', 'card')}
                        alt={product.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain p-2 group-hover/card:scale-103 transition-transform duration-200 ease-ios-spring"
                      />
                      {/* Large discount badge */}
                      <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-sm font-bold px-2 py-1 rounded-bl-xl">
                        {discount}% OFF
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover/card:text-destructive transition-colors">
                      {product.title}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-destructive">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.compare_at_price!)}
                      </span>
                    </div>
                    <p className="text-xs text-success font-medium mt-0.5">
                      Save {formatPrice(savings)}
                    </p>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export const DealsCarousel = memo(DealsCarouselComponent);
