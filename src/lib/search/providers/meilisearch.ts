import { integrations } from "@/lib/env";
import type { SearchHit, SearchProvider, SearchQuery, SearchResult } from "../types";

export const meilisearchProvider: SearchProvider = {
  id: "meilisearch",

  async search(query: SearchQuery): Promise<SearchResult> {
    const cfg = integrations.search.meilisearch;
    if (!cfg) throw new Error("[search] Meilisearch is not configured");

    const start = performance.now();
    const index = query.index ?? "products";
    const url = `${cfg.host.replace(/\/$/, "")}/indexes/${encodeURIComponent(index)}/search`;
    const filter = Object.entries(query.filters ?? {})
      .flatMap(([k, vs]) => vs.map((v) => `${k} = "${v}"`))
      .join(" AND ");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.searchKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query.q,
        limit: query.pageSize ?? 24,
        offset: ((query.page ?? 1) - 1) * (query.pageSize ?? 24),
        filter: filter || undefined,
        facets: ["category", "brand"],
      }),
      signal: query.signal,
    });
    if (!res.ok) throw new Error(`Meilisearch ${res.status}`);
    const json: any = await res.json();

    const hits: SearchHit[] = (json.hits ?? []).map((h: any) => ({
      id: String(h.id ?? h.objectID),
      type: "product",
      title: h.name ?? h.title,
      subtitle: h.category,
      imageUrl: h.image_url,
      url: h.url ?? `/product/${h.slug ?? h.id}`,
      raw: h,
    }));

    return {
      hits,
      total: json.estimatedTotalHits ?? json.totalHits ?? hits.length,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 24,
      facets: json.facetDistribution,
      tookMs: Math.round(performance.now() - start),
      provider: "meilisearch",
    };
  },

  async suggest(prefix, signal) {
    const r = await this.search({ q: prefix, pageSize: 6, signal });
    return r.hits;
  },
};
