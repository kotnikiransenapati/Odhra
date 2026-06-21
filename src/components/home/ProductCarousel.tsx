import React, { memo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Star, TrendingUp, ShoppingCart } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { optimizeImageUrl } from '@/lib/imageOptimization';
import { haptic } from '@/lib/haptics';

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

// Memoized product card with psychological design elements
const ProductItem = memo(function ProductItem({ 
  product, 
  index,
  sortBy,
}: { 
  product: NonNullable<ReturnType<typeof useProducts>['data']>[0];
  index: number;
  sortBy?: string;
}) {
  const primaryImage = product.product_images?.find(img => img.is_primary) || product.product_images?.[0];
  const discount = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;
  const savings = product.compare_at_price ? product.compare_at_price - product.price : 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);

  // Social proof: show rank badges for top 3 in bestsellers/trending
  const showRank = (sortBy === 'popular' || sortBy === 'trending') && index < 3;
  const rankColors = ['bg-accent text-accent-foreground', 'bg-muted-foreground text-background', 'bg-primary/60 text-primary-foreground'];

  return (
    <div
      className="flex-shrink-0 w-36 md:w-44 animate-in fade-in slide-in-from-right-4"
      style={{ animationDelay: `${Math.min(index * 30, 200)}ms`, animationFillMode: 'both' }}
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
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-200 ease-ios-spring"
          />
          {/* Discount badge */}
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded">
              {discount}% OFF
            </div>
          )}
          {/* Rank badge for bestsellers/trending */}
          {showRank && (
            <div className={`absolute top-2 right-2 w-7 h-7 rounded-lg ${rankColors[index]} flex items-center justify-center text-xs font-bold shadow-md`}>
              #{index + 1}
            </div>
          )}
          {/* Low stock urgency */}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="absolute bottom-2 left-2 bg-destructive/90 text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
              Only {product.stock} left!
            </div>
          )}
          {/* Sold count social proof */}
          {!showRank && product.sold_count && product.sold_count > 20 && (
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
          <span className="text-sm font-bold text-accent">
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
        {/* Savings anchoring */}
        {savings > 100 && (
          <p className="text-[10px] font-semibold text-success mt-0.5">
            You save {formatPrice(savings)}
          </p>
        )}
        {/* Rating */}
        {product.avg_rating && product.avg_rating > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3 h-3 text-warning fill-warning" />
            <span className="text-xs text-muted-foreground">
              {product.avg_rating.toFixed(1)}
              {product.review_count ? ` (${product.review_count})` : ''}
            </span>
          </div>
        )}
        {product.vendors_public?.brand_name && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {product.vendors_public.brand_name}
          </p>
        )}
      </Link>
    </div>
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

  // Count for social proof header
  const totalSold = products?.reduce((sum, p) => sum + (p.sold_count || 0), 0) || 0;

  return (
    <section className={`py-8 md:py-10 ${bgColor} rounded-3xl mx-3 md:mx-4 my-4 overflow-hidden`}>
      {/* Header */}
      <div className="px-5 md:px-6 mb-6">
        <div className="flex items-end justify-between gap-4 border-b border-border/40 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className={`font-display text-2xl md:text-3xl tracking-tight ${titleColor} leading-none`}>{title}</h2>
              {badge && (
                <Badge className={`${badgeColor} text-[10px] px-2 py-0.5 uppercase tracking-widest font-semibold`}>
                  {badge}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs md:text-sm text-muted-foreground mt-2 tracking-wide">
                {subtitle}
                {sortBy === 'popular' && totalSold > 50 && (
                  <span className="text-success font-medium"> · {totalSold.toLocaleString('en-IN')}+ sold</span>
                )}
              </p>
            )}
          </div>
          <Link 
            to={viewAllLink}
            className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:text-accent border-b border-transparent hover:border-accent pb-1 transition-colors"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
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
            products?.map((product, index) => (
              <ProductItem key={product.id} product={product} index={index} sortBy={sortBy} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export const ProductCarousel = memo(ProductCarouselComponent);
