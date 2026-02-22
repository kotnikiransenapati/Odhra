import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, Store, Share2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useRemoveFromWishlist, WishlistItem } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  const handleShare = async () => {
    const url = `${window.location.origin}/product/${product.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
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
        'group relative rounded-2xl overflow-hidden border border-border/50 bg-card transition-all hover:shadow-xl hover:border-accent/20',
        (isOutOfStock || isInactive) && 'opacity-60'
      )}
    >
      {/* Image */}
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <img
            src={primaryImage?.url || '/placeholder.svg'}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {discount > 0 && (
              <Badge variant="destructive" className="font-bold">{discount}% OFF</Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
            {isInactive && (
              <Badge variant="secondary">Unavailable</Badge>
            )}
          </div>

          {/* Hover action buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => { e.preventDefault(); handleRemove(); }}
              disabled={removeFromWishlist.isPending}
              className="rounded-full bg-background/90 backdrop-blur-sm shadow-md h-9 w-9"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => { e.preventDefault(); handleShare(); }}
              className="rounded-full bg-background/90 backdrop-blur-sm shadow-md h-9 w-9"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Quick view on hover */}
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
            <Button
              variant="secondary"
              size="sm"
              className="w-full bg-background/90 backdrop-blur-sm gap-1.5 text-xs shadow-md"
              onClick={(e) => e.preventDefault()}
              asChild
            >
              <Link to={`/product/${product.slug}`}>
                <Eye className="w-3.5 h-3.5" />
                Quick View
              </Link>
            </Button>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Vendor */}
        {product.vendors && (
          <Link
            to={`/vendor/${product.vendors.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
          >
            <Store className="w-3 h-3" />
            {product.vendors.brand_name}
          </Link>
        )}

        {/* Title */}
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-semibold text-sm line-clamp-2 hover:text-accent transition-colors leading-snug">
            {product.title}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
          {discount > 0 && (
            <span className="text-xs font-semibold text-green-600">Save {discount}%</span>
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
          {isOutOfStock ? 'Out of Stock' : 'Move to Cart'}
        </Button>
      </div>
    </motion.div>
  );
}
