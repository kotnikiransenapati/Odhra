/**
 * Search adapter contract.
 *
 * The site has multiple search surfaces (header autocomplete, /shop facets,
 * voice search). Concrete providers (Postgres FTS, Algolia, Meilisearch) all
 * implement this interface so call-sites stay provider-agnostic.
 */
export interface SearchHit {
  id: string;
  type: "product" | "category" | "vendor" | "article";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  url: string;
  score?: number;
  /** Free-form provider payload for facet rendering / debugging. */
  raw?: Record<string, unknown>;
}

export interface SearchFacetValue {
  value: string;
  count: number;
}

export interface SearchFacets {
  [facet: string]: SearchFacetValue[];
}

export interface SearchQuery {
  q: string;
  /** Optional semantic terms from AI query expansion. Providers may OR them with q. */
  expandedTerms?: string[];
  /** Optional structured price intent inferred from natural language. */
  priceMin?: number | null;
  priceMax?: number | null;
  /** Faceted filters keyed by attribute. */
  filters?: Record<string, string[]>;
  /** 1-indexed page. */
  page?: number;
  pageSize?: number;
  /** Sort token, e.g. `price_asc`. Implementation-defined. */
  sort?: string;
  /** Optional bias toward a logical index (e.g. "products"). */
  index?: string;
  signal?: AbortSignal;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  facets?: SearchFacets;
  /** Round-trip time in ms for telemetry. */
  tookMs: number;
  provider: string;
  expansionApplied?: boolean;
}

export interface SearchProvider {
  readonly id: "postgres" | "algolia" | "meilisearch";
  search(query: SearchQuery): Promise<SearchResult>;
  /** Lightweight typeahead suggestions; providers may reuse `search`. */
  suggest(prefix: string, signal?: AbortSignal): Promise<SearchHit[]>;
}
