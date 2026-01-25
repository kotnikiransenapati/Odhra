import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useBundles, Bundle } from '@/hooks/useBundles';
import { toast } from 'sonner';

interface BundleCardProps {
  bundle: Bundle;
}

export function BundleCard({ bundle }: BundleCardProps) {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const { calculateSavings } = useBundles();

  const savings = calculateSavings(bundle);
  const savingsPercentage = bundle.compare_at_price 
    ? Math.round((1 - bundle.bundle_price / bundle.compare_at_price) * 100)
    : 0;

  const handleAddToCart = async () => {
    // Add bundle as individual items
    for (const item of bundle.items || []) {
      if (item.product_id) {
        await addItem(item.product_id, item.quantity, {
          bundle_id: bundle.id,
          bundle_name: bundle.title,
        });
      }
    }
    toast.success('Bundle added to cart!', {
      description: `You saved ${formatPrice(savings)}`
    });
  };

  const displayImage = bundle.image_url 
    || bundle.items?.[0]?.product?.product_images?.find(img => img.is_primary)?.url
    || bundle.items?.[0]?.product?.product_images?.[0]?.url
    || '/placeholder.svg';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
    >
      {/* Header Badge */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Bundle Deal</span>
        </div>
        {savingsPercentage > 0 && (
          <Badge className="bg-green-500 text-white">
            Save {savingsPercentage}%
          </Badge>
        )}
      </div>

      {/* Image */}
      <Link to={`/bundle/${bundle.slug}`}>
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img
            src={displayImage}
            alt={bundle.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Items preview overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex -space-x-2">
            {bundle.items?.slice(0, 4).map((item, idx) => (
              <div 
                key={item.id}
                className="w-10 h-10 rounded-full border-2 border-background overflow-hidden bg-muted"
              >
                <img
                  src={item.product?.product_images?.[0]?.url || '/placeholder.svg'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {(bundle.items?.length || 0) > 4 && (
              <div className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                +{(bundle.items?.length || 0) - 4}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 space-y-4">
        <Link to={`/bundle/${bundle.slug}`}>
          <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
            {bundle.title}
          </h3>
        </Link>

        {/* What's Included */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Includes {bundle.items?.length} items:
          </p>
          <ul className="space-y-1">
            {bundle.items?.slice(0, 3).map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <Check className="h-3 w-3 text-green-500" />
                <span className="truncate">
                  {item.quantity > 1 && `${item.quantity}x `}
                  {item.product?.title}
                </span>
              </li>
            ))}
            {(bundle.items?.length || 0) > 3 && (
              <li className="text-sm text-muted-foreground pl-5">
                + {(bundle.items?.length || 0) - 3} more items
              </li>
            )}
          </ul>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(bundle.bundle_price)}
          </span>
          {bundle.compare_at_price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(bundle.compare_at_price)}
            </span>
          )}
        </div>

        {savings > 0 && (
          <div className="text-sm text-green-600 font-medium">
            You save {formatPrice(savings)}
          </div>
        )}

        {/* Add to Cart */}
        <Button 
          onClick={handleAddToCart}
          className="w-full"
          disabled={bundle.stock === 0}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {bundle.stock === 0 ? 'Out of Stock' : 'Add Bundle to Cart'}
        </Button>
      </div>
    </motion.div>
  );
}
