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
    const terms = Array.from(new Set([q, ...(query.expandedTerms ?? [])]
      .map((term) => term.replace(/[%,(){}]/g, " ").replace(/\s+/g, " ").trim().toLowerCase())
      .filter(Boolean)))
      .slice(0, 8);
    let req: any = (supabase as any)
      .from("products")
      .select("id, title, description, slug, price, category_id, categories(name, slug), product_images(url, is_primary)", { count: "exact" })
      .eq("is_active", true)
      .range(from, to);

    if (terms.length) {
      req = req.or(terms.flatMap((term) => [
        `title.ilike.%${term}%`,
        `description.ilike.%${term}%`,
      ]).join(","));
    }

    if (typeof query.priceMin === "number") req = req.gte("price", query.priceMin);
    if (typeof query.priceMax === "number") req = req.lte("price", query.priceMax);

    const cat = query.filters?.category?.[0];
    if (cat && /^[0-9a-f-]{36}$/i.test(cat)) req = req.eq("category_id", cat);

    if (query.sort === "price_asc") req = req.order("price", { ascending: true });
    else if (query.sort === "price_desc") req = req.order("price", { ascending: false });
    else req = req.order("created_at", { ascending: false });

    if (query.signal) req = req.abortSignal(query.signal);
    const { data, count, error } = await req;
    if (error) throw error;

    const hits: SearchHit[] = (data ?? []).map((p: any) => ({
      id: p.id,
      type: "product",
      title: p.title,
      subtitle: p.categories?.name ?? undefined,
      imageUrl: p.product_images?.find?.((img: any) => img.is_primary)?.url ?? p.product_images?.[0]?.url ?? undefined,
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
