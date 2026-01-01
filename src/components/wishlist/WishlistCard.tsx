import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Trash2, ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useRemoveFromWishlist, WishlistItem } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';

interface WishlistCardProps {
  item: WishlistItem;
}

export function WishlistCard({ item }: WishlistCardProps) {
  const { addItem } = useCart();
  const removeFromWishlist = useRemoveFromWishlist();
  const product = item.product;

  if (!product) return null;

  const primaryImage = product.product_images?.find((img) => img.is_primary) || product.product_images?.[0];
  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddToCart = async () => {
    await addItem(product.id, 1);
  };

  const handleRemove = () => {
    removeFromWishlist.mutate(product.id);
  };

  const isOutOfStock = product.stock === 0;
  const isInactive = !product.is_active;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'group relative rounded-2xl overflow-hidden border border-border/50 bg-card transition-all hover:shadow-lg',
        (isOutOfStock || isInactive) && 'opacity-60'
      )}
    >
      {/* Image */}
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={primaryImage?.url || '/placeholder.svg'}
            alt={product.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {discount > 0 && (
              <Badge variant="destructive">{discount}% OFF</Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
            {isInactive && (
              <Badge variant="secondary">Unavailable</Badge>
            )}
          </div>

          {/* Remove Button */}
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              handleRemove();
            }}
            disabled={removeFromWishlist.isPending}
            className="absolute top-3 right-3 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Vendor */}
        {product.vendors && (
          <Link
            to={`/vendor/${product.vendors.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Store className="w-3 h-3" />
            {product.vendors.brand_name}
          </Link>
        )}

        {/* Title */}
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-medium line-clamp-2 hover:text-accent transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-accent">
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isInactive}
          className="w-full gap-2"
          size="sm"
        >
          <ShoppingBag className="w-4 h-4" />
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
    </motion.div>
  );
}
