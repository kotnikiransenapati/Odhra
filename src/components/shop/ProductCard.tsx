import React, { useState, useMemo, memo, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, Loader2, Eye, Flame, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { Product } from '@/hooks/useProducts';
import { haptic } from '@/lib/haptics';
import { optimizeImageUrl, generateSrcSet, getImageSizes } from '@/lib/imageOptimization';

// Lazy-mount the quick-view dialog only when actually opened — saves DOM + JS on grids
const ProductQuickView = lazy(() =>
  import('@/components/shop/ProductQuickView').then((m) => ({ default: m.ProductQuickView }))
);

interface ProductCardProps {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  vendorName?: string;
  vendorSlug?: string;
  isFeatured?: boolean;
  stock?: number;
  soldCount?: number;
  /** Above-the-fold card → eager-load + fetchpriority="high" for LCP */
  priority?: boolean;
}

function ProductCardComponent({
  id,
  title,
  slug,
  price,
  compareAtPrice,
  imageUrl,
  rating = 0,
  reviewCount = 0,
  vendorName,
  vendorSlug,
  isFeatured,
  stock = 0,
  soldCount = 0,
  priority = false,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [quickViewMounted, setQuickViewMounted] = useState(false);

  const quickViewProduct: Product | null = useMemo(() => {
    if (!quickViewMounted) return null;
    return {
      id, title, slug, price, compare_at_price: compareAtPrice || null,
      description: null, stock, is_active: true, is_featured: isFeatured || false,
      avg_rating: rating, review_count: reviewCount, category_id: null, vendor_id: '',
      tags: null, created_at: '',
      product_images: imageUrl ? [{ url: imageUrl, is_primary: true, alt_text: title }] : [],
      vendors_public: vendorName ? { brand_name: vendorName, slug: '' } : null,
      categories: null,
    };
  }, [quickViewMounted, id, title, slug, price, compareAtPrice, stock, isFeatured, rating, reviewCount, imageUrl, vendorName]);

  const discount = compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const formatPrice = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptic('success');
    setIsAdding(true);
    await addItem(id);
    setIsAdding(false);
  }, [addItem, id]);

  const handleQuickView = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptic('light');
    setQuickViewMounted(true);
    setShowQuickView(true);
  }, []);

  const showLowStock = stock > 0 && stock <= 5;
  const showPopular = soldCount > 50 || reviewCount > 20;

  const viewerCount = useMemo(() => {
    if (stock > 0 && stock <= 10) {
      const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
      return 3 + (seed % 8);
    }
    return 0;
  }, [id, stock]);

  const resolvedImage = optimizeImageUrl(imageUrl || '/placeholder.svg', 'card');
  const srcSet = imageUrl ? generateSrcSet(imageUrl) : '';
  const sizesAttr = getImageSizes('card');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group relative bg-card border border-border/60 hover:border-foreground/30 hover:shadow-lg transition-all duration-200 will-change-transform"
    >
      {/* Image */}
      <Link to={`/product/${slug}`} className="block relative aspect-square overflow-hidden bg-muted/40">
        <img
          src={resolvedImage}
          {...(srcSet ? { srcSet, sizes: sizesAttr } : {})}
          alt={title}
          width={400}
          height={400}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          {...({ fetchpriority: priority ? 'high' : 'low' } as Record<string, string>)}
          className="w-full h-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {/* Top Left Badges — Sharp tags, Amazon-utility style */}
        <div className="absolute top-0 left-0 flex flex-col gap-px">
          {discount > 0 && (
            <span className="bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1">
              {discount}% off
            </span>
          )}
          {isFeatured && discount === 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1">
              Featured
            </span>
          )}
          {stock === 0 && (
            <span className="bg-muted text-muted-foreground text-[10px] font-medium uppercase px-2 py-1">
              Sold out
            </span>
          )}
        </div>

        {/* Urgency / social proof — bottom-left chip */}
        {showLowStock ? (
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wide">
            <Flame className="w-3 h-3" /> Only {stock} left
          </div>
        ) : viewerCount > 0 ? (
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 bg-foreground/85 text-background text-[10px] font-medium tracking-wide backdrop-blur-sm">
            <Users className="w-3 h-3" /> {viewerCount} viewing
          </div>
        ) : null}

        {/* Quick Actions — top right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <WishlistButton productId={id} productTitle={title} className="min-w-[36px] min-h-[36px] w-9 h-9 shadow-md bg-background/95 backdrop-blur-sm border border-border/60" />
          <Button
            variant="secondary"
            size="icon"
            className="min-w-[36px] min-h-[36px] w-9 h-9 shadow-md bg-background/95 backdrop-blur-sm border border-border/60"
            onClick={handleQuickView}
            onMouseEnter={() => setQuickViewMounted(true)}
            aria-label={`Quick view ${title}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </Link>

      {/* Info — dense, scannable block */}
      <div className="p-3 space-y-1.5">
        {vendorName && (
          <Link
            to={vendorSlug ? `/store/${vendorSlug}` : '#'}
            className="text-[10px] text-muted-foreground truncate font-bold tracking-[0.12em] uppercase hover:text-accent transition-colors block"
            onClick={(e) => e.stopPropagation()}
          >
            {vendorName}
          </Link>
        )}

        <Link to={`/product/${slug}`} aria-label={`View details for ${title}`}>
          <h3 className="font-medium text-[13px] leading-snug line-clamp-2 hover:text-accent transition-colors min-h-[2.4rem]">
            {title}
          </h3>
        </Link>

        {/* Rating */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-warning text-warning" />
              <span className="font-semibold tabular-nums">{rating.toFixed(1)}</span>
            </span>
            <span className="text-muted-foreground">({reviewCount.toLocaleString('en-IN')})</span>
            {showPopular && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-success font-medium">
                <TrendingUp className="w-3 h-3" />
                {soldCount > 0 ? `${soldCount} sold` : 'Trending'}
              </span>
            )}
          </div>
        )}

        {/* Price block — Amazon-style hierarchy */}
        <div className="pt-0.5">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground leading-none">₹</span>
            <span className="text-lg font-bold text-foreground leading-none tabular-nums">
              {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(price)}
            </span>
            {compareAtPrice && (
              <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>
          {compareAtPrice && (
            <p className="text-[10px] text-success font-semibold mt-0.5">
              You save {formatPrice(compareAtPrice - price)}
            </p>
          )}
        </div>

        {/* Add to cart — inline, appears on hover, hairline accent */}
        <Button
          size="sm"
          className="w-full h-9 mt-2 gap-1.5 text-[12px] font-bold uppercase tracking-wider rounded-none bg-foreground text-background hover:bg-accent hover:text-accent-foreground transition-colors"
          disabled={stock === 0 || isAdding}
          onClick={handleAddToCart}
          aria-label={stock > 0 ? `Add ${title} to cart` : `${title} is out of stock`}
        >
          {isAdding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {stock > 0 ? 'Add to cart' : 'Sold out'}
        </Button>
      </div>

      {quickViewMounted && quickViewProduct && (
        <Suspense fallback={null}>
          <ProductQuickView
            product={quickViewProduct}
            open={showQuickView}
            onOpenChange={setShowQuickView}
          />
        </Suspense>
      )}
    </motion.div>
  );
}

export const ProductCard = memo(ProductCardComponent);
