import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PriceHistoryPoint {
  recorded_at: string;
  price: number;
  compare_at_price: number | null;
}

export interface PriceHistoryStats {
  points: PriceHistoryPoint[];
  min: number;
  max: number;
  current: number;
  lowestInRange: number;
  isAtOrNearLow: boolean; // current within 2% of 90-day low
  pctFromLow: number;
}

export function usePriceHistory(productId?: string, days = 90) {
  return useQuery({
    queryKey: ["price-history", productId, days],
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PriceHistoryStats | null> => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("price_history")
        .select("recorded_at, price, compare_at_price")
        .eq("product_id", productId!)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      const points = (data ?? []) as PriceHistoryPoint[];
      if (points.length === 0) return null;
      const prices = points.map((p) => Number(p.price));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const current = Number(points[points.length - 1].price);
      const pctFromLow = min > 0 ? ((current - min) / min) * 100 : 0;
      return {
        points,
        min,
        max,
        current,
        lowestInRange: min,
        isAtOrNearLow: pctFromLow <= 2,
        pctFromLow,
      };
    },
  });
}
