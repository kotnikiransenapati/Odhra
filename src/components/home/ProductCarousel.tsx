import React, { memo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { optimizeImageUrl } from '@/lib/imageOptimization';
import { haptic } from '@/lib/haptics';
import { SPRING } from '@/lib/animations';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  bgColor?: string;
  titleColor?: string;
  featured?: boolean;
  limit?: number;
  viewAllLink?: string;
  badge?: string;
  badgeColor?: string;
  categorySlug?: string;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating' | 'trending';
  tags?: string[];
}

// Memoized product card for performance
const ProductItem = memo(function ProductItem({ 
  product, 
  index 
}: { 
  product: NonNullable<ReturnType<typeof useProducts>['data']>[0];
  index: number;
}) {
  const primaryImage = product.product_images?.find(img => img.is_primary) || product.product_images?.[0];
  const discount = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <motion.div
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
        <div className="relative aspect-square bg-card rounded-xl overflow-hidden mb-2 border border-border/30 group-hover/card:border-accent/30 transition-colors duration-150">
          <img
            src={optimizeImageUrl(primaryImage?.url || '/placeholder.svg', 'card')}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain p-2 group-hover/card:scale-103 transition-transform duration-200 ease-ios-spring"
          />
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded">
              {discount}% OFF
            </div>
          )}
        </div>
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover/card:text-accent transition-colors duration-150">
          {product.title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-accent">
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
        {product.vendors_public?.brand_name && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {product.vendors_public.brand_name}
          </p>
        )}
      </Link>
    </motion.div>
  );
});

function ProductCarouselComponent({ 
  title, 
  subtitle,
  bgColor = 'bg-secondary/50 dark:bg-secondary/30',
  titleColor = 'text-foreground',
  featured = false,
  limit = 8,
  viewAllLink = '/shop',
  badge,
  badgeColor = 'bg-accent text-accent-foreground',
  categorySlug,
  sortBy = 'newest',
  tags
}: ProductCarouselProps) {
  const { data: products, isLoading } = useProducts({ 
    featured, 
    limit, 
    categorySlug,
    sortBy,
    tags
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      haptic('light');
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  // Don't render if no products and not loading
  if (!isLoading && (!products || products.length === 0)) {
    return null;
  }

  return (
    <section className={`py-4 ${bgColor} rounded-2xl mx-4 my-3 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg md:text-xl font-bold ${titleColor}`}>{title}</h2>
              {badge && (
                <Badge className={`${badgeColor} text-xs px-2 py-0.5`}>
                  {badge}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <Link 
          to={viewAllLink}
          className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Products Scroll */}
      <div className="relative group">
        {/* Scroll buttons - hidden on mobile */}
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
            products?.map((product, index) => (
              <ProductItem key={product.id} product={product} index={index} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export const ProductCarousel = memo(ProductCarouselComponent);
