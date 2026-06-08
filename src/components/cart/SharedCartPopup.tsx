import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Package,
  X,
  Plus,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  Gift,
  Loader2,
} from 'lucide-react';

interface SharedCartItem {
  product_id: string;
  quantity: number;
  title?: string;
  price?: number;
  compare_at_price?: number | null;
  image_url?: string;
  slug?: string;
  vendor_name?: string;
}

interface SharedCartData {
  id: string;
  share_code: string;
  items: SharedCartItem[];
  item_count: number;
  subtotal: number;
  message?: string;
  views_count: number;
  adds_count: number;
  created_at: string;
}

export function SharedCartPopup() {
  const { isEnabled } = useFeatureFlag('cart_sharing');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [sharedCart, setSharedCart] = useState<SharedCartData | null>(null);
  const [enrichedItems, setEnrichedItems] = useState<SharedCartItem[]>([]);

  const shareCode = searchParams.get('shared_cart');

  useEffect(() => {
    if (!shareCode || !isEnabled) return;

    const fetchSharedCart = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('shared_carts')
          .select('*')
          .eq('share_code', shareCode)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error || !data) {
          toast.error('This shared cart link has expired or is invalid');
          clearShareParam();
          return;
        }

        setSharedCart(data as unknown as SharedCartData);

        // Increment views
        await supabase
          .from('shared_carts')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', data.id);

        // Enrich items with current product data
        const items = (data.items as unknown as SharedCartItem[]) || [];
        const productIds = items.map(i => i.product_id);
        
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select(`id, title, slug, price, compare_at_price, stock, product_images (url, is_primary), vendors (brand_name)`)
            .in('id', productIds)
            .eq('is_active', true);

          const enriched = items.map(item => {
            const product = products?.find(p => p.id === item.product_id);
            if (!product) return { ...item, _unavailable: true };
            const primaryImage = product.product_images?.find((img: any) => img.is_primary);
            return {
              ...item,
              title: product.title,
              slug: product.slug,
              price: product.price,
              compare_at_price: product.compare_at_price,
              image_url: primaryImage?.url,
              vendor_name: product.vendors?.brand_name,
            };
          }).filter(i => !(i as any)._unavailable);

          setEnrichedItems(enriched);
        }

        setIsOpen(true);
      } catch (err) {
        console.error('Error fetching shared cart:', err);
        toast.error('Failed to load shared cart');
        clearShareParam();
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedCart();
  }, [shareCode]);

  const clearShareParam = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('shared_cart');
    setSearchParams(newParams, { replace: true });
  };

  const handleClose = () => {
    setIsOpen(false);
    clearShareParam();
  };

  const handleAddAllToCart = async () => {
    if (!sharedCart || enrichedItems.length === 0) return;
    setIsAdding(true);

    try {
      for (const item of enrichedItems) {
        await addItem(item.product_id, item.quantity);
      }

      // Increment adds count
      await supabase
        .from('shared_carts')
        .update({ adds_count: (sharedCart.adds_count || 0) + 1 })
        .eq('id', sharedCart.id);

      toast.success(`🎉 ${enrichedItems.length} items added to your cart!`);
      setIsOpen(false);
      clearShareParam();
      navigate('/cart');
    } catch (err) {
      toast.error('Failed to add items to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const totalSavings = enrichedItems.reduce((acc, item) => {
    if (item.compare_at_price && item.price) {
      return acc + (item.compare_at_price - item.price) * item.quantity;
    }
    return acc;
  }, 0);

  const liveSubtotal = enrichedItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  if (!isOpen || !sharedCart) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-x-4 top-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-card rounded-2xl shadow-2xl border border-border/50 z-[101] overflow-hidden max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="relative p-5 pb-4 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 rounded-full"
                onClick={handleClose}
              >
                <X className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 0] }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="p-2.5 rounded-xl bg-accent/15"
                >
                  <Gift className="w-6 h-6 text-accent" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold">Someone shared their cart with you!</h2>
                  <p className="text-sm text-muted-foreground">
                    {enrichedItems.length} item{enrichedItems.length !== 1 ? 's' : ''} curated just for you
                  </p>
                </div>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {sharedCart.views_count + 1} views
                </span>
                {sharedCart.adds_count > 0 && (
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {sharedCart.adds_count} added to cart
                  </span>
                )}
              </div>

              {sharedCart.message && (
                <p className="mt-3 text-sm italic text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  "{sharedCart.message}"
                </p>
              )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 pt-3 space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : (
                enrichedItems.map((item, index) => (
                  <motion.div
                    key={item.product_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-accent/20 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={item.image_url || '/placeholder.svg'}
                        alt={item.title || 'Product'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title || 'Product'}</p>
                      {item.vendor_name && (
                        <p className="text-xs text-muted-foreground">{item.vendor_name}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <Badge variant="secondary" className="text-xs">
                          Qty: {item.quantity}
                        </Badge>
                        <div className="text-right">
                          <span className="text-sm font-bold text-accent">
                            {formatPrice((item.price || 0) * item.quantity)}
                          </span>
                          {item.compare_at_price && item.compare_at_price > (item.price || 0) && (
                            <span className="text-xs text-muted-foreground line-through ml-1.5">
                              {formatPrice(item.compare_at_price * item.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-5 pt-3 border-t border-border/50 bg-card space-y-3">
              {/* Savings callout */}
              {totalSavings > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-success/10 border border-success/20"
                >
                  <Sparkles className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-success">
                    You save {formatPrice(totalSavings)} with this cart!
                  </span>
                </motion.div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Cart Total</p>
                  <p className="text-xl font-bold">{formatPrice(liveSubtotal)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} size="sm">
                    Not Now
                  </Button>
                  <Button
                    onClick={handleAddAllToCart}
                    disabled={isAdding || enrichedItems.length === 0}
                    className="gap-2 shadow-lg"
                    size="sm"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add All to Cart
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Secure checkout · Free returns · Verified sellers
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
