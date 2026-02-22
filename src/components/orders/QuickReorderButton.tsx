import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { OrderItem } from '@/hooks/useOrders';

interface QuickReorderButtonProps {
  items: OrderItem[];
  variant?: 'default' | 'compact';
}

export function QuickReorderButton({ items, variant = 'default' }: QuickReorderButtonProps) {
  const { addItem } = useCart();
  const [isReordering, setIsReordering] = useState(false);

  const handleReorder = useCallback(async () => {
    setIsReordering(true);
    try {
      for (const item of items) {
        if (item.product_id) {
          await addItem(item.product_id, item.quantity);
        }
      }
      toast.success(`${items.length} item${items.length > 1 ? 's' : ''} added to cart`, {
        description: 'Your previous order items are in your cart!',
      });
    } catch {
      toast.error('Some items could not be added');
    } finally {
      setIsReordering(false);
    }
  }, [items, addItem]);

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-accent hover:text-accent"
        onClick={handleReorder}
        disabled={isReordering}
      >
        {isReordering ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        Reorder
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleReorder}
      disabled={isReordering}
    >
      {isReordering ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShoppingBag className="w-4 h-4" />
      )}
      Buy Again ({items.length} item{items.length > 1 ? 's' : ''})
    </Button>
  );
}
