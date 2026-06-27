import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTopCategories } from "@/lib/conversion/affinity";

export interface GuestForYouProduct {
  id: string;
  title: string;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  avg_rating: number | null;
  review_count: number | null;
  stock: number;
  sold_count: number | null;
  is_featured: boolean | null;
  product_images: { url: string; is_primary: boolean | null }[];
}

/**
 * Guest-friendly "For You" rail. Pulls active products from the visitor's top
 * browsing categories (affinity-weighted). Returns an empty list silently when
 * the visitor has no affinity yet — caller should hide the rail in that case.
 */
export function useGuestForYou(limit = 12) {
  const categoryIds = getTopCategories(4);

  return useQuery({
    queryKey: ["guest-for-you", categoryIds.join(",")],
    enabled: categoryIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<GuestForYouProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, title, slug, price, compare_at_price, avg_rating, review_count, stock, sold_count, is_featured, category_id, product_images(url, is_primary)"
        )
        .in("category_id", categoryIds)
        .eq("is_active", true)
        .gt("stock", 0)
        .order("sold_count", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as GuestForYouProduct[];
    },
  });
}
