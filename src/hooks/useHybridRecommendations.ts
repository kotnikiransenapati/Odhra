import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTopCategories } from "@/lib/conversion/affinity";
import { rankHybrid, type CandidateProduct, type CoPurchaseSignal } from "@/lib/recommendations/hybridScorer";

interface UseHybridRecommendationsOptions {
  anchorProductId?: string;
  limit?: number;
  priceBand?: { min: number; max: number };
}

/**
 * Returns top-N products scored by the hybrid recommender.
 * Pulls candidates from active products in top-affinity categories +
 * co-purchase neighbours of the anchor product, ranks them client-side.
 */
export function useHybridRecommendations(opts: UseHybridRecommendationsOptions = {}) {
  const { anchorProductId, limit = 8, priceBand } = opts;
  const topCategories = getTopCategories(4);
  const recentlyViewedIds = readRecentlyViewedIds();

  return useQuery({
    queryKey: ["hybrid-recs", anchorProductId ?? "none", topCategories.join(","), limit],
    staleTime: 60_000,
    queryFn: async () => {
      // 1. Co-purchase neighbours (collaborative signal)
      let coPurchase: CoPurchaseSignal[] = [];
      if (anchorProductId) {
        const { data } = await supabase
          .from("product_associations")
          .select("associated_product_id, strength, purchase_count")
          .eq("product_id", anchorProductId)
          .order("strength", { ascending: false })
          .limit(20);
        coPurchase = (data ?? []).map((r: any) => ({
          product_id: r.associated_product_id,
          strength: Math.min(1, Number(r.strength) || 0),
          purchase_count: r.purchase_count ?? 0,
        }));
      }

      // 2. Candidate pool: union of affinity-category products + co-purchase neighbours
      const neighbourIds = coPurchase.map((c) => c.product_id);
      const candidateIds = new Set<string>(neighbourIds);
      const desiredPool = Math.max(limit * 4, 24);

      const mapRow = (r: any): CandidateProduct => ({
        id: r.id,
        category_id: r.category_id ?? null,
        price: r.price ?? null,
        rating: r.avg_rating ?? null,
        rating_count: r.review_count ?? null,
      });

      let categoryCandidates: CandidateProduct[] = [];
      if (topCategories.length) {
        const { data } = await supabase
          .from("products")
          .select("id, category_id, price, avg_rating, review_count")
          .in("category_id", topCategories)
          .eq("is_active", true)
          .limit(desiredPool);
        categoryCandidates = (data ?? []).map(mapRow);
      }

      let neighbourCandidates: CandidateProduct[] = [];
      if (neighbourIds.length) {
        const { data } = await supabase
          .from("products")
          .select("id, category_id, price, avg_rating, review_count")
          .in("id", neighbourIds)
          .eq("is_active", true);
        neighbourCandidates = (data ?? []).map(mapRow);
      }

      if (!categoryCandidates.length && !neighbourCandidates.length) {
        const { data } = await supabase
          .from("products")
          .select("id, category_id, price, avg_rating, review_count")
          .eq("is_active", true)
          .order("avg_rating", { ascending: false, nullsFirst: false })
          .limit(desiredPool);
        categoryCandidates = (data ?? []).map(mapRow);
      }

      const merged = new Map<string, CandidateProduct>();
      for (const c of [...categoryCandidates, ...neighbourCandidates]) {
        if (!c?.id || c.id === anchorProductId) continue;
        merged.set(c.id, c);
      }

      const ranked = rankHybrid({
        candidates: Array.from(merged.values()),
        coPurchase,
        topCategoryIds: topCategories,
        recentlyViewedIds,
        priceBand,
      }).slice(0, limit);

      if (!ranked.length) return [];

      // 3. Hydrate display fields for the winning IDs
      const ids = ranked.map((r) => r.id);
      const { data: hydrated } = await supabase
        .from("products")
        .select("id, title, price, slug, avg_rating, review_count, product_images(url, is_primary, sort_order)")
        .in("id", ids);

      const byId = new Map((hydrated ?? []).map((p: any) => [p.id, p]));
      return ranked
        .map((r) => {
          const p: any = byId.get(r.id);
          if (!p) return null;
          const image =
            p.product_images?.find((i: any) => i.is_primary)?.url ||
            p.product_images?.[0]?.url ||
            null;
          return {
            id: p.id,
            title: p.title,
            price: p.price,
            slug: p.slug,
            rating: p.rating,
            rating_count: p.rating_count,
            image,
            score: r.score,
            breakdown: r.breakdown,
          };
        })
        .filter(Boolean) as Array<{
          id: string;
          title: string;
          price: number;
          slug: string;
          rating: number | null;
          rating_count: number | null;
          image: string | null;
          score: number;
          breakdown: ReturnType<typeof rankHybrid>[number]["breakdown"];
        }>;
    },
  });
}

function readRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("recently_viewed_products");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, 20).map((x: any) => x?.id).filter(Boolean) : [];
  } catch {
    return [];
  }
}
