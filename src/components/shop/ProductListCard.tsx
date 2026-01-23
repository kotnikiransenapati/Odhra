import React, { useState, useMemo, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, Loader2, Eye, Flame, TrendingUp, Check, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { ProductQuickView } from '@/components/shop/ProductQuickView';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { SPRING } from '@/lib/animations';

interface ProductListCardProps {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  vendorName?: string;
  isFeatured?: boolean;
  stock?: number;
  soldCount?: number;
  description?: string | null;
}

function ProductListCardComponent({
  id,
  title,
  slug,
  price,
  compareAtPrice,
  imageUrl,
  rating = 0,
  reviewCount = 0,
  vendorName,
  isFeatured,
  stock = 0,
  soldCount = 0,
  description,
}: ProductListCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);

  const quickViewProduct: Product = useMemo(() => ({
    id, title, slug, price, compare_at_price: compareAtPrice || null,
    description: description || null, stock, is_active: true, is_featured: isFeatured || false,
    avg_rating: rating, review_count: reviewCount, category_id: null, vendor_id: '',
    tags: null, created_at: '',
    product_images: imageUrl ? [{ url: imageUrl, is_primary: true, alt_text: title }] : [],
    vendors_public: vendorName ? { brand_name: vendorName, slug: '' } : null,
    categories: null,
  }), [id, title, slug, price, compareAtPrice, description, stock, isFeatured, rating, reviewCount, imageUrl, vendorName]);

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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.99 }}
        transition={SPRING.stiff}
        className="group relative glass rounded-xl overflow-hidden will-change-transform backface-hidden"
      >
        <Link to={`/product/${slug}`} className="flex gap-4 p-3">
          {/* Image - Psychology: Visual anchor, quick scan */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-lg overflow-hidden bg-secondary/50">
            <img
              src={imageUrl || '/placeholder.svg'}
              alt={title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-200 ease-ios-spring group-hover:scale-105"
            />
            {/* Discount badge overlay */}
            {discount > 0 && (
              <div className="absolute top-1 left-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                -{discount}%
              </div>
            )}
            {stock === 0 && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">Sold Out</span>
              </div>
            )}
          </div>

          {/* Content - Psychology: Info hierarchy for quick decisions */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              {/* Top row: Vendor + Featured */}
              <div className="flex items-center gap-2 mb-1">
                {vendorName && (
                  <span className="text-[11px] text-muted-foreground truncate">{vendorName}</span>
                )}
                {isFeatured && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Featured</Badge>
                )}
              </div>

              {/* Title */}
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                {title}
              </h3>

              {/* Rating row - Psychology: Social proof */}
              <div className="flex items-center gap-3 mt-1.5">
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">{rating.toFixed(1)}</span>
                    <span className="text-[10px] text-muted-foreground">({reviewCount})</span>
                  </div>
                )}
                {showPopular && (
                  <div className="flex items-center gap-1 text-[10px] text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>{soldCount > 0 ? `${soldCount} sold` : 'Popular'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row: Price + Urgency */}
            <div className="flex items-end justify-between gap-2 mt-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-base font-bold text-accent">{formatPrice(price)}</span>
                {compareAtPrice && (
                  <span className="text-xs text-muted-foreground line-through">{formatPrice(compareAtPrice)}</span>
                )}
              </div>
              
              {/* Psychology: Urgency indicators */}
              {showLowStock && (
                <span className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                  <Flame className="w-3 h-3" />
                  {stock} left
                </span>
              )}
            </div>
          </div>

          {/* Actions - Right side */}
          <div className="flex flex-col items-center justify-between shrink-0">
            <WishlistButton productId={id} productTitle={title} className="w-8 h-8 min-w-[32px] min-h-[32px]" />
            
            <div className="flex flex-col gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={handleQuickView}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                className="w-8 h-8"
                disabled={stock === 0 || isAdding}
                onClick={handleAddToCart}
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Link>

        {/* Trust signals for in-stock items - Psychology: Reduce friction */}
        {stock > 0 && (
          <div className="px-3 pb-2 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-green-500" /> In Stock
            </span>
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3" /> Free Shipping
            </span>
          </div>
        )}
      </motion.div>

      <ProductQuickView
        product={quickViewProduct}
        open={showQuickView}
        onOpenChange={setShowQuickView}
      />
    </>
  );
}

export const ProductListCard = memo(ProductListCardComponent);
