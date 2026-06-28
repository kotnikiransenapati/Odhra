import { integrations } from "@/lib/env";
import type { SearchHit, SearchProvider, SearchQuery, SearchResult } from "../types";

/**
 * Algolia provider — uses the public search-only key via the REST API so we
 * don't need to bundle the Algolia client. Falls back gracefully if not
 * configured.
 */
export const algoliaProvider: SearchProvider = {
  id: "algolia",

  async search(query: SearchQuery): Promise<SearchResult> {
    const cfg = integrations.search.algolia;
    if (!cfg) throw new Error("[search] Algolia is not configured");

    const start = performance.now();
    const index = query.index ?? "products";
    const url = `https://${cfg.appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(index)}/query`;

    const facetFilters = Object.entries(query.filters ?? {}).flatMap(([k, vs]) =>
      vs.map((v) => `${k}:${v}`),
    );

    const semanticQuery = [query.q, ...(query.expandedTerms ?? [])].filter(Boolean).join(" ");
    const numericFilters = [
      typeof query.priceMin === "number" ? `price>=${query.priceMin}` : null,
      typeof query.priceMax === "number" ? `price<=${query.priceMax}` : null,
    ].filter(Boolean) as string[];

    const body = {
      query: semanticQuery,
      hitsPerPage: query.pageSize ?? 24,
      page: Math.max(0, (query.page ?? 1) - 1),
      facets: ["category", "brand", "price"],
      facetFilters,
      numericFilters,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": cfg.appId,
        "X-Algolia-API-Key": cfg.searchKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: query.signal,
    });
    if (!res.ok) throw new Error(`Algolia ${res.status}`);
    const json: any = await res.json();

    const hits: SearchHit[] = (json.hits ?? []).map((h: any) => ({
      id: h.objectID,
      type: "product",
      title: h.name ?? h.title,
      subtitle: h.category,
      imageUrl: h.image_url,
      url: h.url ?? `/product/${h.slug ?? h.objectID}`,
      score: h._rankingInfo?.userScore,
      raw: h,
    }));

    return {
      hits,
      total: json.nbHits ?? hits.length,
      page: (json.page ?? 0) + 1,
      pageSize: json.hitsPerPage ?? body.hitsPerPage,
      facets: json.facets,
      tookMs: Math.round(performance.now() - start),
      provider: "algolia",
    };
  },

  async suggest(prefix, signal) {
    const r = await this.search({ q: prefix, pageSize: 6, signal });
    return r.hits;
  },
};
