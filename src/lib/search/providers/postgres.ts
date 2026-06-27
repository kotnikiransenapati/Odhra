import { supabase } from "@/integrations/supabase/client";
import type { SearchHit, SearchProvider, SearchQuery, SearchResult } from "../types";

/**
 * Default provider — uses Supabase Postgres ILIKE/FTS via the `products` table.
 * Designed to be safe for unauthenticated visitors (relies on existing RLS).
 */
export const postgresProvider: SearchProvider = {
  id: "postgres",

  async search(query: SearchQuery): Promise<SearchResult> {
    const start = performance.now();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(60, Math.max(1, query.pageSize ?? 24));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const q = query.q.trim();
    let req: any = (supabase as any)
      .from("products")
      .select("id, name, slug, price, image_url, category", { count: "exact" })
      .eq("status", "active")
      .range(from, to);

    if (q) req = req.ilike("name", `%${q}%`);

    const cat = query.filters?.category?.[0];
    if (cat) req = req.eq("category", cat);

    if (query.sort === "price_asc") req = req.order("price", { ascending: true });
    else if (query.sort === "price_desc") req = req.order("price", { ascending: false });
    else req = req.order("created_at", { ascending: false });

    if (query.signal) req = req.abortSignal(query.signal);
    const { data, count, error } = await req;
    if (error) throw error;

    const hits: SearchHit[] = (data ?? []).map((p: any) => ({
      id: p.id,
      type: "product",
      title: p.name,
      subtitle: p.category ?? undefined,
      imageUrl: p.image_url ?? undefined,
      url: `/product/${p.slug ?? p.id}`,
      raw: p,
    }));

    return {
      hits,
      total: count ?? hits.length,
      page,
      pageSize,
      tookMs: Math.round(performance.now() - start),
      provider: "postgres",
    };
  },

  async suggest(prefix, signal) {
    const r = await this.search({ q: prefix, pageSize: 6, signal });
    return r.hits;
  },
};
