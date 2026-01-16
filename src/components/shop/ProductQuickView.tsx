import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ShoppingBag, Heart, Minus, Plus, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { Product } from '@/hooks/useProducts';

interface ProductQuickViewProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductQuickView({ product, open, onOpenChange }: ProductQuickViewProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  if (!product) return null;

  const primaryImage = product.product_images?.find(img => img.is_primary)?.url || 
                       product.product_images?.[0]?.url || 
                       '/placeholder.svg';
  const images = product.product_images?.map(img => img.url) || [primaryImage];

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
    setIsAdding(true);
    for (let i = 0; i < quantity; i++) {
      await addItem(product.id);
    }
    setIsAdding(false);
    setQuantity(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{product.title} - Quick View</DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Section */}
          <div className="relative bg-secondary/30 p-6">
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 md:hidden"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {product.is_featured && (
                <Badge className="bg-accent text-accent-foreground">Featured</Badge>
              )}
              {discount > 0 && (
                <Badge variant="destructive">{discount}% OFF</Badge>
              )}
              {product.stock === 0 && (
                <Badge variant="secondary">Out of Stock</Badge>
              )}
            </div>

            {/* Main Image */}
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="aspect-square rounded-xl overflow-hidden"
            >
              <img
                src={images[selectedImage]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {images.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      selectedImage === idx ? 'border-accent' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 flex flex-col">
            {/* Vendor */}
            {product.vendors_public && (
              <Link
                to={`/vendor/${product.vendors_public.slug}`}
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                {product.vendors_public.brand_name}
              </Link>
            )}

            {/* Title */}
            <h2 className="text-2xl font-bold mt-1 line-clamp-2">{product.title}</h2>

            {/* Rating */}
            {product.review_count && product.review_count > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{(product.avg_rating || 0).toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  ({product.review_count} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mt-4">
              <span className="text-3xl font-bold text-accent">
                {formatPrice(product.price)}
              </span>
              {product.compare_at_price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
              )}
            </div>

            <Separator className="my-4" />

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                {product.description}
              </p>
            )}

            {/* Category */}
            {product.categories && (
              <div className="text-sm mb-4">
                <span className="text-muted-foreground">Category: </span>
                <Link
                  to={`/shop?category=${product.categories.slug}`}
                  className="text-accent hover:underline"
                >
                  {product.categories.name}
                </Link>
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-4">
              {product.stock > 0 ? (
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="text-sm text-destructive flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  Out of Stock
                </span>
              )}
            </div>

            <div className="mt-auto space-y-4">
              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  disabled={product.stock === 0 || isAdding}
                  onClick={handleAddToCart}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                  Add to Cart
                </Button>
                <WishlistButton productId={product.id} className="h-12 w-12" />
              </div>

              {/* View Full Details */}
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link to={`/product/${product.slug}`}>
                  <ExternalLink className="w-4 h-4" />
                  View Full Details
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
