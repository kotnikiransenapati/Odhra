import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrendingProduct {
  id: string;
  title: string;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  primary_image: string | null;
  vendor_name: string | null;
  vendor_slug: string | null;
  viewer_count: number;
  view_count: number;
}

export function useTrendingProducts(days = 7, limit = 12) {
  return useQuery({
    queryKey: ["trending-products", days, limit],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<TrendingProduct[]> => {
      const { data, error } = await supabase.rpc("get_trending_products", {
        _days: days,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as TrendingProduct[];
    },
  });
}
