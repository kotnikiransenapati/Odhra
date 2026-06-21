import React, { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, Loader2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { waitForCartUi } from '@/lib/cartAction';

interface ProductCompactCardProps {
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
}

function ProductCompactCardComponent({
  id,
  title,
  slug,
  price,
  compareAtPrice,
  imageUrl,
  rating = 0,
  reviewCount = 0,
  stock = 0,
}: ProductCompactCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

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
    try {
      await waitForCartUi(addItem(id));
    } finally {
      setIsAdding(false);
    }
  }, [addItem, id]);

  const showLowStock = stock > 0 && stock <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group relative rounded-xl overflow-hidden border border-border/30 bg-card hover:border-border/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 will-change-transform"
    >
      <Link to={`/product/${slug}`} className="block">
        {/* Compact Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={imageUrl || '/placeholder.svg'}
            alt={title}
            width={200}
            height={200}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-1.5 left-0 bg-destructive text-destructive-foreground text-[9px] font-bold px-2 py-0.5 rounded-r-full">
              -{discount}%
            </span>
          )}

          {stock === 0 && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[1px]">
              <span className="text-[10px] font-medium">Sold Out</span>
            </div>
          )}

          {/* Quick add on hover */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
            <Button
              size="sm"
              className="w-full h-7 rounded-none text-xs gap-1"
              disabled={stock === 0 || isAdding}
              onClick={handleAddToCart}
            >
              {isAdding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ShoppingBag className="w-3 h-3" />
              )}
              Add
            </Button>
          </div>

          {/* Urgency */}
          {showLowStock && (
            <div className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-destructive/90 text-destructive-foreground text-[9px] font-semibold">
              <Flame className="w-2.5 h-2.5" />
              {stock}
            </div>
          )}
        </div>

        {/* Minimal Info */}
        <div className="p-2.5">
          <h3 className="text-[11px] font-medium line-clamp-2 leading-tight group-hover:text-accent transition-colors min-h-[28px]">
            {title}
          </h3>

          {reviewCount > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              <Star className="w-2.5 h-2.5 fill-warning text-warning" />
              <span className="text-[10px] text-muted-foreground">{rating.toFixed(1)}</span>
            </div>
          )}

          <div className="flex items-baseline gap-1 mt-1 flex-wrap">
            <span className="text-sm font-bold text-accent">{formatPrice(price)}</span>
            {compareAtPrice && (
              <span className="text-[10px] text-muted-foreground line-through">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>
          {compareAtPrice && (
            <span className="text-[9px] text-success font-semibold mt-0.5 block">
              Save {formatPrice(compareAtPrice - price)}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export const ProductCompactCard = memo(ProductCompactCardComponent);
