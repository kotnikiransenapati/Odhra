import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselConfig, useCarouselProducts } from '@/hooks/useHomepageCarousels';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CMSProductCarouselProps {
  config: CarouselConfig;
}

export function CMSProductCarousel({ config }: CMSProductCarouselProps) {
  const { data: products, isLoading } = useCarouselProducts(config);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const bgColor = config.settings.bgColor || 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30';
  const badgeColor = config.settings.badgeColor || 'bg-accent text-accent-foreground';

  return (
    <section className={`py-4 ${bgColor} rounded-2xl mx-4 my-3 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-foreground">{config.title}</h2>
              {config.settings.badge && (
                <Badge className={`${badgeColor} text-xs px-2 py-0.5`}>
                  {config.settings.badge}
                </Badge>
              )}
            </div>
            {config.subtitle && (
              <p className="text-sm text-muted-foreground">{config.subtitle}</p>
            )}
          </div>
        </div>
        <Link 
          to={config.settings.viewAllLink || '/shop'}
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
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex shadow-lg"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex shadow-lg"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2"
        >
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-36 md:w-44">
                <Skeleton className="aspect-square rounded-xl mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))
          ) : products && products.length > 0 ? (
            products.map((product, index) => {
              const primaryImage = product.product_images?.find(img => img.is_primary);
              const discount = product.compare_at_price 
                ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
                : 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex-shrink-0 w-36 md:w-44"
                >
                  <Link 
                    to={`/product/${product.slug}`}
                    className="block group/card"
                  >
                    <div className="relative aspect-square bg-white dark:bg-card rounded-xl overflow-hidden mb-2 border border-border/30 group-hover/card:border-accent/30 transition-colors">
                      <img
                        src={primaryImage?.url || '/placeholder.svg'}
                        alt={product.title}
                        className="w-full h-full object-contain p-2 group-hover/card:scale-105 transition-transform duration-300"
                      />
                      {discount > 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                          {discount}% OFF
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover/card:text-accent transition-colors">
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.vendors_public.brand_name}
                      </p>
                    )}
                  </Link>
                </motion.div>
              );
            })
          ) : (
            <div className="flex-1 text-center py-8">
              <p className="text-muted-foreground">No products available</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
