import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ShoppingBag, Trash2, X, ShoppingCart } from 'lucide-react';

export function MiniCartDropdown() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, removeItem } = useCart();
  const [open, setOpen] = React.useState(false);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={itemCount > 0 ? `Shopping cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : 'Shopping cart'}
        >
          <ShoppingBag className="w-5 h-5" aria-hidden="true" />
          {itemCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center"
              aria-hidden="true"
            >
              {itemCount > 99 ? '99+' : itemCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end" 
        sideOffset={8}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Shopping Cart</h3>
            <span className="text-sm text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Your cart is empty
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setOpen(false);
                navigate('/shop');
              }}
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[300px]">
              <div className="p-2 space-y-2">
                <AnimatePresence mode="popLayout">
                  {items.slice(0, 5).map((item) => (
                    <motion.div
                      key={item.product_id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img
                          src={item.image_url || '/placeholder.svg'}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/product/${item.slug}`}
                          className="text-sm font-medium truncate block hover:text-accent transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-sm font-semibold text-accent">
                          {formatPrice((item.price || 0) * item.quantity)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {items.length > 5 && (
                  <p className="text-center text-xs text-muted-foreground py-2">
                    +{items.length - 5} more items
                  </p>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="font-bold text-accent">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setOpen(false);
                    navigate('/cart');
                  }}
                >
                  View Cart
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setOpen(false);
                    navigate('/checkout');
                  }}
                >
                  Checkout
                </Button>
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
