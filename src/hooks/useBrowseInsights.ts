import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BrowseInsights {
  totalViews: number;
  uniqueProducts: number;
  topCategories: { name: string; count: number }[];
  topVendors: { name: string; slug: string | null; count: number }[];
  avgPrice: number | null;
  mostViewedProduct: {
    id: string;
    title: string;
    slug: string | null;
    image?: string;
    views: number;
  } | null;
  last7Days: { date: string; count: number }[];
}

interface Row {
  product_id: string;
  viewed_at: string;
  view_count: number;
  product: {
    id: string;
    title: string;
    slug: string | null;
    price: number;
    product_images: { url: string; is_primary: boolean | null }[];
    categories: { name: string } | null;
    vendors: { brand_name: string; slug: string | null } | null;
  } | null;
}

export function useBrowseInsights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["browse-insights", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<BrowseInsights> => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("recently_viewed_products")
        .select(`
          product_id, viewed_at, view_count,
          product:products!recently_viewed_products_product_id_fkey (
            id, title, slug, price,
            product_images (url, is_primary),
            categories (name),
            vendors (brand_name, slug)
          )
        `)
        .eq("user_id", user!.id)
        .gte("viewed_at", since)
        .order("viewed_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      const rows = (data ?? []) as unknown as Row[];

      const cat = new Map<string, number>();
      const ven = new Map<string, { name: string; slug: string | null; count: number }>();
      const days = new Map<string, number>();
      let totalViews = 0;
      let priceSum = 0;
      let priceN = 0;
      let top: BrowseInsights["mostViewedProduct"] = null;

      for (const r of rows) {
        const vc = r.view_count || 1;
        totalViews += vc;
        const p = r.product;
        if (!p) continue;
        if (p.categories?.name) cat.set(p.categories.name, (cat.get(p.categories.name) ?? 0) + vc);
        if (p.vendors?.brand_name) {
          const k = p.vendors.brand_name;
          const cur = ven.get(k) ?? { name: k, slug: p.vendors.slug, count: 0 };
          cur.count += vc;
          ven.set(k, cur);
        }
        if (typeof p.price === "number") { priceSum += p.price; priceN += 1; }
        if (!top || vc > top.views) {
          top = {
            id: p.id,
            title: p.title,
            slug: p.slug,
            image: p.product_images?.find((i) => i.is_primary)?.url ?? p.product_images?.[0]?.url,
            views: vc,
          };
        }
      }

      // last 7 days bucket
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.set(d.toISOString().slice(0, 10), 0);
      }
      for (const r of rows) {
        const key = r.viewed_at.slice(0, 10);
        if (days.has(key)) days.set(key, (days.get(key) ?? 0) + (r.view_count || 1));
      }

      return {
        totalViews,
        uniqueProducts: new Set(rows.map((r) => r.product_id)).size,
        topCategories: Array.from(cat.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topVendors: Array.from(ven.values()).sort((a, b) => b.count - a.count).slice(0, 5),
        avgPrice: priceN ? Math.round(priceSum / priceN) : null,
        mostViewedProduct: top,
        last7Days: Array.from(days.entries()).map(([date, count]) => ({ date, count })),
      };
    },
  });
}
