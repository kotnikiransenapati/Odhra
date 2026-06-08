import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface PriceDropBadgeProps {
  productId: string;
  currentPrice: number;
}

export function PriceDropBadge({ productId, currentPrice }: PriceDropBadgeProps) {
  const { isEnabled } = useFeatureFlag('price_drop_alerts');
  const { data: priceDrop } = useQuery({
    queryKey: ['price-drop', productId, isEnabled],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('price_history')
        .select('price')
        .eq('product_id', productId)
        .gte('recorded_at', sevenDaysAgo.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(1);

      if (!data?.length) return null;

      const prevPrice = Number(data[0].price);
      if (currentPrice < prevPrice) {
        return {
          previousPrice: prevPrice,
          dropPercent: Math.round(((prevPrice - currentPrice) / prevPrice) * 100),
          savings: prevPrice - currentPrice,
        };
      }
      return null;
    },
    staleTime: 10 * 60 * 1000,
    enabled: isEnabled,
  });

  if (!isEnabled) return null;

  if (!priceDrop) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/15 border border-success/25 text-success text-xs font-semibold"
    >
      <TrendingDown className="w-3.5 h-3.5" />
      Price dropped {priceDrop.dropPercent}% this week!
    </motion.div>
  );
}
