import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, Store, Bell, Eye, Users, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useRemoveFromWishlist, WishlistItem } from '@/hooks/useWishlist';
import { useJoinWaitlist, useWaitlistStatus } from '@/hooks/useWaitlist';
import { cn } from '@/lib/utils';

interface WishlistCardProps {
  item: WishlistItem;
}

export function WishlistCard({ item }: WishlistCardProps) {
  const { addItem } = useCart();
  const removeFromWishlist = useRemoveFromWishlist();
  const joinWaitlist = useJoinWaitlist();
  const product = item.product;
  const { data: waitlistEntry } = useWaitlistStatus(product?.id || '');

  if (!product) return null;

  const primaryImage = product.product_images?.find((img) => img.is_primary) || product.product_images?.[0];
  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) {
      await joinWaitlist.mutateAsync(product.id);
      return;
    }
    await addItem(product.id, 1);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromWishlist.mutate(product.id);
  };

  const isOutOfStock = product.stock === 0;
  const isInactive = !product.is_active;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  // Fake social proof
  const viewerCount = Math.floor(Math.random() * 15) + 3;

  return (
    <motion.div
      layout
      className={cn(
        'group relative flex gap-3 p-3 rounded-xl border border-border/50 bg-card transition-all hover:shadow-md hover:border-accent/20',
        (isOutOfStock || isInactive) && 'opacity-60'
      )}
    >
      {/* Compact Image */}
      <Link to={`/product/${product.slug}`} className="shrink-0">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-muted">
          <img
            src={primaryImage?.url || '/placeholder.svg'}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {discount > 0 && (
            <Badge variant="destructive" className="absolute top-1 left-1 text-[10px] px-1.5 py-0">
              -{discount}%
            </Badge>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top row */}
        <div>
          {product.vendors && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mb-0.5">
              <Store className="w-2.5 h-2.5" />
              {product.vendors.brand_name}
            </span>
          )}
          <Link to={`/product/${product.slug}`}>
            <h3 className="font-medium text-sm line-clamp-2 leading-tight hover:text-accent transition-colors">
              {product.title}
            </h3>
          </Link>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-base font-bold">{formatPrice(product.price)}</span>
          {product.compare_at_price && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
          )}
          {discount > 0 && (
            <span className="text-[11px] font-semibold text-success flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" />
              Save {formatPrice(product.compare_at_price! - product.price)}
            </span>
          )}
        </div>

        {/* Social proof & urgency */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {isLowStock && (
            <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
              Only {product.stock} left!
            </span>
          )}
          {isOutOfStock && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Out of Stock
            </span>
          )}
          {!isOutOfStock && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" />
              {viewerCount} viewing
            </span>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isInactive}
            size="sm"
            className="h-8 text-xs gap-1.5 flex-1"
          >
            {isOutOfStock ? <Bell className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
            {isOutOfStock ? (waitlistEntry ? 'Watching' : 'Notify Me') : 'Add to Cart'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={removeFromWishlist.isPending}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
