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
import { haptic } from '@/lib/haptics';

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
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="group relative rounded-xl overflow-hidden border border-border/30 bg-card hover:border-border/60 hover:shadow-md transition-all duration-200 will-change-transform"
      >
        <Link to={`/product/${slug}`} className="flex gap-4 p-3">
          {/* Image */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-lg overflow-hidden bg-secondary/30">
            <img
              src={imageUrl || '/placeholder.svg'}
              alt={title}
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {discount > 0 && (
              <span className="absolute top-1 left-0 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-r-full">
                -{discount}%
              </span>
            )}
            {stock === 0 && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">Sold Out</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {vendorName && (
                  <span className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-medium">{vendorName}</span>
                )}
                {isFeatured && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Featured</Badge>
                )}
              </div>

              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                {title}
              </h3>

              <div className="flex items-center gap-3 mt-1.5">
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1 bg-secondary/50 rounded-full px-2 py-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-[11px] font-medium">{rating.toFixed(1)}</span>
                    <span className="text-[10px] text-muted-foreground">({reviewCount})</span>
                  </div>
                )}
                {showPopular && (
                  <div className="flex items-center gap-1 text-[10px] text-success font-medium">
                    <TrendingUp className="w-3 h-3" />
                    <span>{soldCount > 0 ? `${soldCount} sold` : 'Popular'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 mt-2">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-base font-bold text-accent">{formatPrice(price)}</span>
                  {compareAtPrice && (
                    <span className="text-xs text-muted-foreground line-through">{formatPrice(compareAtPrice)}</span>
                  )}
                </div>
                {compareAtPrice && (
                  <span className="text-[10px] text-success font-semibold bg-success/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                    Save {formatPrice(compareAtPrice - price)}
                  </span>
                )}
              </div>
              
              {showLowStock && (
                <span className="flex items-center gap-1 text-[10px] text-destructive font-semibold">
                  <Flame className="w-3 h-3" />
                  {stock} left
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
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

        {/* Trust signals */}
        {stock > 0 && (
          <div className="px-3 pb-2.5 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-success" /> In Stock
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
