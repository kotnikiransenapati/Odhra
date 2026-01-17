import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, Loader2, Eye, Flame, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { ProductQuickView } from '@/components/shop/ProductQuickView';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

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
  isFeatured?: boolean;
  stock?: number;
  soldCount?: number;
}

// Haptic feedback
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([10]);
  }
};

export function ProductCard({
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
}: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);

  const quickViewProduct: Product = {
    id, title, slug, price, compare_at_price: compareAtPrice || null,
    description: null, stock, is_active: true, is_featured: isFeatured || false,
    avg_rating: rating, review_count: reviewCount, category_id: null, vendor_id: '',
    tags: null, created_at: '',
    product_images: imageUrl ? [{ url: imageUrl, is_primary: true, alt_text: title }] : [],
    vendors_public: vendorName ? { brand_name: vendorName, slug: '' } : null,
    categories: null,
  };

  const discount = compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    setIsAdding(true);
    await addItem(id);
    setIsAdding(false);
  };

  // Psychology: Show urgency indicators
  const showLowStock = stock > 0 && stock <= 5;
  const showPopular = soldCount > 50 || reviewCount > 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group relative glass rounded-2xl overflow-hidden"
    >
      {/* Image */}
      <Link to={`/product/${slug}`} className="block relative aspect-square overflow-hidden">
        <img
          src={imageUrl || '/placeholder.svg'}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isFeatured && (
            <Badge className="bg-accent text-accent-foreground shadow-lg">Featured</Badge>
          )}
          {discount > 0 && (
            <Badge variant="destructive" className="shadow-lg animate-pulse">
              {discount}% OFF
            </Badge>
          )}
          {stock === 0 && (
            <Badge variant="secondary">Out of Stock</Badge>
          )}
        </div>

        {/* Urgency indicator - Psychology: Scarcity */}
        {showLowStock && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/90 text-destructive-foreground text-xs font-medium backdrop-blur-sm"
          >
            <Flame className="w-3 h-3" />
            Only {stock} left!
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <WishlistButton productId={id} productTitle={title} className="min-w-[44px] min-h-[44px] w-11 h-11 shadow-lg" />
          <Button
            variant="secondary"
            size="icon"
            className="min-w-[44px] min-h-[44px] w-11 h-11 shadow-lg"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }}
            aria-label={`Quick view ${title}`}
          >
            <Eye className="w-4 h-4" />
            <span className="sr-only">Quick view</span>
          </Button>
        </div>

        {/* Add to Cart Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button
            className="w-full gap-2 shadow-xl btn-press min-h-[44px]"
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
        {/* Vendor name */}
        {vendorName && (
          <p className="text-xs text-muted-foreground mb-1 truncate">{vendorName}</p>
        )}
        
        {/* Title - Using h3 for proper heading hierarchy */}
        <Link to={`/product/${slug}`} aria-label={`View details for ${title}`}>
          <h3 className="font-medium text-sm line-clamp-2 hover:text-accent transition-colors mb-2 min-h-[2.5rem]">
            {title}
          </h3>
        </Link>

        {/* Rating & Social Proof */}
        <div className="flex items-center gap-2 mb-2 min-h-[20px]">
          {reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold">{rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({reviewCount})</span>
            </div>
          )}
          {/* Popular indicator - Psychology: Social Proof */}
          {showPopular && !showLowStock && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>Popular</span>
            </div>
          )}
        </div>

        {/* Price with savings highlight */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold text-accent">
            {formatPrice(price)}
          </span>
          {compareAtPrice && (
            <>
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(compareAtPrice)}
              </span>
              <span className="text-xs text-green-600 font-medium">
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
