import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

// Check if any wishlist items have dropped in price
export function useWishlistPriceDrops() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist-price-drops', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's wishlist product IDs
      const { data: wishlist, error: wErr } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id);

      if (wErr || !wishlist?.length) return [];

      const productIds = wishlist.map(w => w.product_id);

      // Get recent price drops (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('product_id, price, recorded_at')
        .in('product_id', productIds)
        .gte('recorded_at', sevenDaysAgo.toISOString())
        .order('recorded_at', { ascending: false });

      if (!priceHistory?.length) return [];

      // Get current prices
      const { data: products } = await supabase
        .from('products')
        .select('id, title, slug, price, product_images(url, is_primary)')
        .in('id', productIds);

      if (!products) return [];

      // Find products where current price < recent recorded price
      const drops: Array<{
        productId: string;
        title: string;
        slug: string;
        currentPrice: number;
        previousPrice: number;
        imageUrl: string;
        dropPercent: number;
      }> = [];

      for (const product of products) {
        const history = priceHistory.filter(h => h.product_id === product.id);
        if (history.length > 0) {
          const previousPrice = Number(history[0].price);
          if (product.price < previousPrice) {
            const img = product.product_images?.find((i: any) => i.is_primary) || product.product_images?.[0];
            drops.push({
              productId: product.id,
              title: product.title,
              slug: product.slug,
              currentPrice: product.price,
              previousPrice,
              imageUrl: (img as any)?.url || '/placeholder.svg',
              dropPercent: Math.round(((previousPrice - product.price) / previousPrice) * 100),
            });
          }
        }
      }

      return drops;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Show toast notification for price drops on mount
export function usePriceDropNotifications() {
  const { data: drops } = useWishlistPriceDrops();

  useEffect(() => {
    if (!drops?.length) return;

    const shownKey = 'price-drop-notified';
    const shown = sessionStorage.getItem(shownKey);
    if (shown) return;

    sessionStorage.setItem(shownKey, 'true');

    // Show first drop as toast after small delay
    const timer = setTimeout(() => {
      const drop = drops[0];
      toast.info(`Price Drop! ${drop.title}`, {
        description: `Now ₹${drop.currentPrice.toLocaleString()} (was ₹${drop.previousPrice.toLocaleString()}) - ${drop.dropPercent}% off!`,
        action: {
          label: 'View',
          onClick: () => window.location.href = `/product/${drop.slug}`,
        },
        duration: 8000,
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [drops]);
}
