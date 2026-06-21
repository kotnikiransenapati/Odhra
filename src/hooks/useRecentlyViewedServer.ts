import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecentlyViewedRow {
  id: string;
  product_id: string;
  viewed_at: string;
  view_count: number;
  product: {
    id: string;
    title: string;
    slug: string | null;
    price: number;
    product_images: { url: string; is_primary: boolean | null }[];
  } | null;
}

const trackedProductViews = new Set<string>();

/** Server-side recently viewed history (last 50 per user). */
export function useRecentlyViewedServer(limit = 12) {
  const { user } = useAuth();
  const [items, setItems] = useState<RecentlyViewedRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("recently_viewed_products")
      .select(
        `id, product_id, viewed_at, view_count,
         product:products!recently_viewed_products_product_id_fkey(
           id, title, slug, price,
           product_images(url, is_primary)
         )`
      )
      .eq("user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      setItems(data as unknown as RecentlyViewedRow[]);
    }
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase.from("recently_viewed_products").delete().eq("user_id", user.id);
    setItems([]);
  }, [user]);

  const remove = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("recently_viewed_products").delete().eq("id", id).eq("user_id", user.id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    },
    [user]
  );

  return { items, loading, reload: load, clear, remove };
}

/** Fire-and-forget tracker; safe to call for guests (no-op). */
export async function trackProductView(productId: string, source?: string) {
  const key = `${productId}:${source ?? "default"}`;
  if (trackedProductViews.has(key)) return;
  trackedProductViews.add(key);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.rpc("track_product_view", {
      _product_id: productId,
      _source: source ?? null,
    });
  } catch {
    /* swallow — non-critical telemetry */
  }
}
