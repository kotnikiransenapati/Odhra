import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FlashSaleCountdown } from './FlashSaleCountdown';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';

interface FlashSaleCardProps {
  product: {
    id: string;
    product_id: string;
    flash_price: number;
    original_price: number;
    quantity_available: number;
    quantity_sold: number;
    per_user_limit: number;
    product?: {
      id: string;
      title: string;
      slug: string;
      description: string;
      product_images: { url: string; is_primary: boolean }[];
    };
  };
  endTime: string;
}

export function FlashSaleCard({ product, endTime }: FlashSaleCardProps) {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  
  const discount = Math.round((1 - product.flash_price / product.original_price) * 100);
  const soldPercentage = Math.round((product.quantity_sold / (product.quantity_available + product.quantity_sold)) * 100);
  const remaining = product.quantity_available;
  
  const productData = product.product;
  if (!productData) return null;

  const primaryImage = productData.product_images?.find(img => img.is_primary)?.url 
    || productData.product_images?.[0]?.url
    || '/placeholder.svg';

  const handleAddToCart = async () => {
    await addItem(productData.id, 1);
    toast.success('Added to cart!', {
      description: `Flash deal: ${productData.title}`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
    >
      {/* Discount Badge */}
      <div className="absolute top-3 left-3 z-10">
        <Badge className="bg-destructive text-destructive-foreground font-bold text-sm px-2 py-1">
          <Zap className="h-3 w-3 mr-1" />
          {discount}% OFF
        </Badge>
      </div>

      {/* Image */}
      <Link to={`/product/${productData.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={primaryImage}
            alt={productData.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {remaining < 10 && (
            <div className="absolute bottom-2 left-2 right-2">
              <Badge variant="secondary" className="bg-background/90 text-destructive w-full justify-center">
                Only {remaining} left!
              </Badge>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 space-y-3">
        <Link to={`/product/${productData.slug}`}>
          <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
            {productData.title}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-destructive">
            {formatPrice(product.flash_price)}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(product.original_price)}
          </span>
        </div>

        {/* Stock Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{product.quantity_sold} sold</span>
            <span>{remaining} left</span>
          </div>
          <Progress value={soldPercentage} className="h-2" />
        </div>

        {/* Countdown */}
        <FlashSaleCountdown endTime={endTime} variant="compact" />

        {/* Add to Cart */}
        <Button 
          onClick={handleAddToCart}
          className="w-full bg-destructive hover:bg-destructive/90"
          disabled={remaining === 0}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {remaining === 0 ? 'Sold Out' : 'Add to Cart'}
        </Button>
      </div>
    </motion.div>
  );
}
