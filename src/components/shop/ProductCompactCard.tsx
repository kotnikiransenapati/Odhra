import React, { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, Loader2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { SPRING } from '@/lib/animations';

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
  vendorName,
  isFeatured,
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
    await addItem(id);
    setIsAdding(false);
  }, [addItem, id]);

  const showLowStock = stock > 0 && stock <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING.stiff}
      className="group relative glass rounded-lg overflow-hidden will-change-transform backface-hidden"
    >
      <Link to={`/product/${slug}`} className="block">
        {/* Compact Image */}
        <div className="relative aspect-square overflow-hidden bg-secondary/30">
          <img
            src={imageUrl || '/placeholder.svg'}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Overlay badges */}
          <div className="absolute top-1 left-1 flex flex-col gap-0.5">
            {discount > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                -{discount}%
              </Badge>
            )}
          </div>

          {stock === 0 && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-[10px] font-medium">Sold Out</span>
            </div>
          )}

          {/* Quick add button - appears on hover */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-150 ease-ios-spring">
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

          {/* Urgency indicator */}
          {showLowStock && (
            <div className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1 py-0.5 rounded bg-destructive/90 text-destructive-foreground text-[9px]">
              <Flame className="w-2.5 h-2.5" />
              {stock}
            </div>
          )}
        </div>

        {/* Minimal Info - Psychology: Quick scanning */}
        <div className="p-2">
          {/* Title - max 2 lines for compact */}
          <h3 className="text-[11px] font-medium line-clamp-2 leading-tight group-hover:text-accent transition-colors min-h-[28px]">
            {title}
          </h3>

          {/* Rating - Minimal */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span className="text-[10px] text-muted-foreground">{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1 mt-1 flex-wrap">
            <span className="text-sm font-bold text-accent">{formatPrice(price)}</span>
            {compareAtPrice && (
              <span className="text-[10px] text-muted-foreground line-through">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export const ProductCompactCard = memo(ProductCompactCardComponent);
