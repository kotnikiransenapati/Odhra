import React, { useState, useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, Loader2, Eye, Flame, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { ProductQuickView } from '@/components/shop/ProductQuickView';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { optimizeImageUrl } from '@/lib/imageOptimization';

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
}: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);

  const quickViewProduct: Product = useMemo(() => ({
    id, title, slug, price, compare_at_price: compareAtPrice || null,
    description: null, stock, is_active: true, is_featured: isFeatured || false,
    avg_rating: rating, review_count: reviewCount, category_id: null, vendor_id: '',
    tags: null, created_at: '',
    product_images: imageUrl ? [{ url: imageUrl, is_primary: true, alt_text: title }] : [],
    vendors_public: vendorName ? { brand_name: vendorName, slug: '' } : null,
    categories: null,
  }), [id, title, slug, price, compareAtPrice, stock, isFeatured, rating, reviewCount, imageUrl, vendorName]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group relative rounded-2xl overflow-hidden border border-border/40 bg-card hover:border-border/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 will-change-transform backface-hidden"
    >
      {/* Image */}
      <Link to={`/product/${slug}`} className="block relative aspect-[3/4] overflow-hidden">
        <img
          src={optimizeImageUrl(imageUrl || '/placeholder.svg', 'card')}
          alt={title}
          width={400}
          height={533}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
        
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top Left Badges — Ribbons */}
        <div className="absolute top-3 left-0 flex flex-col gap-1.5">
          {isFeatured && (
            <span className="bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-r-full shadow-md">
              Featured
            </span>
          )}
          {discount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-1 rounded-r-full shadow-md">
              {discount}% OFF
            </span>
          )}
          {stock === 0 && (
            <span className="bg-muted text-muted-foreground text-[10px] font-medium px-3 py-1 rounded-r-full">
              Sold Out
            </span>
          )}
        </div>

        {/* Urgency indicator */}
        {showLowStock && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-destructive/90 text-destructive-foreground text-[11px] font-semibold backdrop-blur-sm shadow-lg">
            <Flame className="w-3 h-3" />
            Only {stock} left!
          </div>
        )}

        {/* Live viewers */}
        {viewerCount > 0 && !showLowStock && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-info/90 text-info-foreground text-[11px] font-medium backdrop-blur-sm animate-pulse shadow-lg">
            <Users className="w-3 h-3" />
            {viewerCount} viewing
          </div>
        )}

        {/* Quick Actions - slide in from right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-3 group-hover:translate-x-0">
          <WishlistButton productId={id} productTitle={title} className="min-w-[40px] min-h-[40px] w-10 h-10 shadow-lg rounded-full bg-background/80 backdrop-blur-sm" />
          <Button
            variant="secondary"
            size="icon"
            className="min-w-[40px] min-h-[40px] w-10 h-10 shadow-lg rounded-full bg-background/80 backdrop-blur-sm"
            onClick={handleQuickView}
            aria-label={`Quick view ${title}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {/* Add to Cart - slide up */}
        <div className="absolute inset-x-3 bottom-3 translate-y-[calc(100%+12px)] group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <Button
            className="w-full gap-2 shadow-xl min-h-[44px] rounded-xl backdrop-blur-sm"
            disabled={stock === 0 || isAdding}
            onClick={handleAddToCart}
            aria-label={stock > 0 ? `Add ${title} to cart` : `${title} is out of stock`}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            )}
            {stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        {vendorName && (
          <Link 
            to={vendorSlug ? `/store/${vendorSlug}` : '#'} 
            className="text-[11px] text-muted-foreground mb-1 truncate font-medium tracking-wide uppercase hover:text-accent transition-colors block"
            onClick={(e) => e.stopPropagation()}
          >
            {vendorName}
          </Link>
        )}
        
        <Link to={`/product/${slug}`} aria-label={`View details for ${title}`}>
          <h3 className="font-medium text-sm line-clamp-2 hover:text-accent transition-colors mb-2 min-h-[2.5rem] leading-snug">
            {title}
          </h3>
        </Link>

        {/* Rating & Social Proof */}
        <div className="flex items-center gap-2 mb-2.5 min-h-[20px]">
          {reviewCount > 0 && (
            <div className="flex items-center gap-1 bg-secondary/60 rounded-full px-2 py-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-semibold">{rating.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">({reviewCount})</span>
            </div>
          )}
          {showPopular && !showLowStock && (
            <div className="flex items-center gap-1 text-[11px] text-success font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>{soldCount > 0 ? `${soldCount} sold` : 'Trending'}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-accent">
            {formatPrice(price)}
          </span>
          {compareAtPrice && (
            <>
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(compareAtPrice)}
              </span>
              <span className="text-[11px] text-success font-semibold bg-success/10 px-1.5 py-0.5 rounded">
                Save {formatPrice(compareAtPrice - price)}
              </span>
            </>
          )}
        </div>
      </div>

      <ProductQuickView
        product={quickViewProduct}
        open={showQuickView}
        onOpenChange={setShowQuickView}
      />
    </motion.div>
  );
}

export const ProductCard = memo(ProductCardComponent);
