import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { haptic } from '@/lib/haptics';

interface StickyAddToCartProps {
  isVisible: boolean;
  productTitle: string;
  price: number;
  imageUrl?: string;
  stock: number;
  isAdding: boolean;
  onAddToCart: () => void;
}

export function StickyAddToCart({
  isVisible,
  productTitle,
  price,
  imageUrl,
  stock,
  isAdding,
  onAddToCart,
}: StickyAddToCartProps) {
  const { isEnabled } = useFeatureFlag('sticky_add_to_cart');
  if (!isEnabled) return null;
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 px-4 py-3 md:hidden"
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            {/* Product thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
              <img
                src={imageUrl || '/placeholder.svg'}
                alt={productTitle}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{productTitle}</p>
              <p className="text-lg font-bold text-accent">{formatPrice(price)}</p>
            </div>

            {/* Add to cart button */}
            <Button
              size="lg"
              className={cn(
                'shrink-0 gap-2 btn-press',
                stock === 0 && 'opacity-50'
              )}
              disabled={stock === 0 || isAdding}
              onClick={onAddToCart}
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {stock > 0 ? 'Add' : 'Sold Out'}
              </span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
