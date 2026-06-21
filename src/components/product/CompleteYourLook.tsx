import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useState, useCallback } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface CompleteYourLookProps {
  productId: string;
  categoryId: string | null;
  currentPrice: number;
}

export function CompleteYourLook({ productId, categoryId, currentPrice }: CompleteYourLookProps) {
  const { isEnabled } = useFeatureFlag('cross_sell');
  const { addItem } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data: suggestions } = useQuery({
    queryKey: ['complete-look', productId, categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      // Get products from same category but different price range (complementary)
      const { data, error } = await supabase
        .from('products')
        .select('id, title, slug, price, compare_at_price, product_images(url, is_primary)')
        .eq('category_id', categoryId)
        .neq('id', productId)
        .eq('is_active', true)
        .gt('stock', 0)
        .order('avg_rating', { ascending: false })
        .limit(4);

      if (error) {
        console.warn('[CompleteYourLook] suggestions unavailable', error);
        return [];
      }

      return data || [];
    },
    enabled: !!categoryId,
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  const formatPrice = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const handleAdd = useCallback(async (id: string) => {
    setAddingId(id);
    try {
      await addItem(id);
    } finally {
      setAddingId(null);
    }
  }, [addItem]);

  if (!isEnabled || !suggestions?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-12"
    >
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-accent" />
        <h3 className="text-xl font-bold">Complete Your Look</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {suggestions.map((item: any) => {
          const img = item.product_images?.find((i: any) => i.is_primary) || item.product_images?.[0];
          const discount = item.compare_at_price
            ? Math.round(((item.compare_at_price - item.price) / item.compare_at_price) * 100)
            : 0;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -4 }}
              className="rounded-xl border border-border/40 overflow-hidden bg-card group"
            >
              <Link to={`/product/${item.slug}`} className="block">
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={img?.url || '/placeholder.svg'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {discount > 0 && (
                    <span className="absolute top-2 left-0 bg-destructive text-destructive-foreground text-[9px] font-bold px-2 py-0.5 rounded-r-full">
                      -{discount}%
                    </span>
                  )}
                </div>
              </Link>
              <div className="p-3">
                <Link to={`/product/${item.slug}`}>
                  <h4 className="text-xs font-medium line-clamp-2 hover:text-accent transition-colors mb-1.5 min-h-[2rem]">
                    {item.title}
                  </h4>
                </Link>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-sm font-bold text-accent">{formatPrice(item.price)}</span>
                  {item.compare_at_price && (
                    <span className="text-[10px] text-muted-foreground line-through">
                      {formatPrice(item.compare_at_price)}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs gap-1"
                  onClick={() => handleAdd(item.id)}
                  disabled={addingId === item.id}
                >
                  {addingId === item.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-3 h-3" />
                  )}
                  Add to Cart
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20 text-center">
        <p className="text-sm text-success font-medium">
          💡 Buy together and save on shipping! Free shipping on orders above ₹999
        </p>
      </div>
    </motion.div>
  );
}
