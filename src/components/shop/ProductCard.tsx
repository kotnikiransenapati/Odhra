import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { ProductQuickView } from '@/components/shop/ProductQuickView';
import { Product } from '@/hooks/useProducts';

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
}

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
    setIsAdding(true);
    await addItem(id);
    setIsAdding(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
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
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isFeatured && (
            <Badge className="bg-accent text-accent-foreground">Featured</Badge>
          )}
          {discount > 0 && (
            <Badge variant="destructive">{discount}% OFF</Badge>
          )}
          {stock === 0 && (
            <Badge variant="secondary">Out of Stock</Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <WishlistButton productId={id} className="w-9 h-9" />
          <Button
            variant="secondary"
            size="icon"
            className="w-9 h-9"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {/* Add to Cart Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button
            className="w-full gap-2"
            disabled={stock === 0 || isAdding}
            onClick={handleAddToCart}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
            {stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        {vendorName && (
          <p className="text-xs text-muted-foreground mb-1">{vendorName}</p>
        )}
        
        <Link to={`/product/${slug}`}>
          <h3 className="font-medium text-sm line-clamp-2 hover:text-accent transition-colors mb-2">
            {title}
          </h3>
        </Link>

        {/* Rating */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-accent">
            {formatPrice(price)}
          </span>
          {compareAtPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(compareAtPrice)}
            </span>
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
