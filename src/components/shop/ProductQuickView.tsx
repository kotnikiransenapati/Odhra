import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingBag, Minus, Plus, Loader2, ExternalLink, Shield, Truck, RotateCcw } from 'lucide-react';
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-border/50 shadow-2xl">
        <DialogTitle className="sr-only">{product.title} - Quick View</DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Section */}
          <div className="relative bg-secondary/20 p-6">
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
              {product.is_featured && (
                <Badge className="bg-accent text-accent-foreground shadow-sm">Featured</Badge>
              )}
              {discount > 0 && (
                <Badge variant="destructive" className="shadow-sm">{discount}% OFF</Badge>
              )}
              {product.stock === 0 && (
                <Badge variant="secondary">Out of Stock</Badge>
              )}
            </div>

            {/* Main Image */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="aspect-square rounded-xl overflow-hidden bg-muted/30"
              >
                <img
                  src={images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                {images.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                      selectedImage === idx ? 'border-accent ring-2 ring-accent/20 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 flex flex-col max-h-[80vh] overflow-y-auto">
            {/* Vendor */}
            {product.vendors_public && (
              <Link
                to={`/vendor/${product.vendors_public.slug}`}
                className="text-[11px] text-muted-foreground hover:text-accent transition-colors uppercase tracking-wider font-medium"
              >
                {product.vendors_public.brand_name}
              </Link>
            )}

            {/* Title */}
            <h2 className="text-xl font-bold mt-1.5 line-clamp-2 leading-snug">{product.title}</h2>

            {/* Rating */}
            {product.review_count && product.review_count > 0 && (
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex items-center gap-1 bg-secondary/60 rounded-full px-2.5 py-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold">{(product.avg_rating || 0).toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {product.review_count} reviews
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-bold text-accent">
                {formatPrice(product.price)}
              </span>
              {product.compare_at_price && (
                <>
                  <span className="text-base text-muted-foreground line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                  <span className="text-xs text-success font-semibold bg-success/10 px-2 py-0.5 rounded-full">
                    Save {formatPrice(product.compare_at_price - product.price)}
                  </span>
                </>
              )}
            </div>

            <Separator className="my-4" />

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground text-sm line-clamp-3 mb-4 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Category */}
            {product.categories && (
              <div className="text-sm mb-3">
                <span className="text-muted-foreground">Category: </span>
                <Link
                  to={`/shop?category=${product.categories.slug}`}
                  className="text-accent hover:underline font-medium"
                >
                  {product.categories.name}
                </Link>
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-4">
              {product.stock > 0 ? (
                <span className="text-sm text-success flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="text-sm text-destructive flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  Out of Stock
                </span>
              )}
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-4 py-3 px-3 rounded-xl bg-secondary/30">
              <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Free Ship</span>
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Secure</span>
              <span className="flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> 7-Day Return</span>
            </div>

            <div className="mt-auto space-y-3">
              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Qty:</span>
                <div className="flex items-center border border-border rounded-xl overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-none"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-10 text-center font-semibold text-sm">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-none"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <Button
                  className="flex-1 gap-2 h-12 text-sm font-semibold"
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
                <WishlistButton productId={product.id} className="h-12 w-12 rounded-xl" />
              </div>

              {/* View Full Details */}
              <Button variant="outline" className="w-full gap-2 h-10" asChild>
                <Link to={`/product/${product.slug}`}>
                  <ExternalLink className="w-3.5 h-3.5" />
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
