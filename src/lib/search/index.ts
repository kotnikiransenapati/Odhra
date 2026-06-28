/**
 * Central search registry. Picks the active provider based on `env`, with a
 * safe fallback to Postgres so the app always functions even if the configured
 * provider is misconfigured at runtime.
 */
import { integrations } from "@/lib/env";
import { expandSearchQuery } from "./semanticExpand";
import { algoliaProvider } from "./providers/algolia";
import { meilisearchProvider } from "./providers/meilisearch";
import { postgresProvider } from "./providers/postgres";
import type { SearchProvider, SearchQuery, SearchResult } from "./types";

function normalizeTerm(term: string) {
  return term
    .replace(/[%,(){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 80);
}

async function withSemanticExpansion(query: SearchQuery): Promise<SearchQuery> {
  const q = query.q?.trim() ?? "";
  if (!q || query.expandedTerms) return query;

  const expansion = await expandSearchQuery(q);
  if (!expansion) return query;

  const expandedTerms = Array.from(new Set([
    ...(expansion.expanded_terms ?? []),
    expansion.intent_category ?? "",
  ].map(normalizeTerm).filter(Boolean))).slice(0, 8);

  if (!expandedTerms.length && expansion.intent_price_min == null && expansion.intent_price_max == null) {
    return query;
  }

  return {
    ...query,
    expandedTerms,
    priceMin: query.priceMin ?? expansion.intent_price_min,
    priceMax: query.priceMax ?? expansion.intent_price_max,
  };
}

function pick(): SearchProvider {
  switch (integrations.search.provider) {
    case "algolia":
      return integrations.search.algolia ? algoliaProvider : postgresProvider;
    case "meilisearch":
      return integrations.search.meilisearch ? meilisearchProvider : postgresProvider;
    default:
      return postgresProvider;
  }
}

export const searchProvider: SearchProvider = pick();

/**
 * High-level wrapper that runs the active provider with a Postgres failover.
 * Logs telemetry breadcrumb via the observability layer when search fails.
 */
export async function search(query: SearchQuery): Promise<SearchResult> {
  const enrichedQuery = await withSemanticExpansion(query);
  try {
    const result = await searchProvider.search(enrichedQuery);
    return { ...result, expansionApplied: !!enrichedQuery.expandedTerms?.length };
  } catch (err) {
    if (searchProvider.id !== "postgres") {
      // eslint-disable-next-line no-console
      console.warn(`[search] ${searchProvider.id} failed, falling back to postgres`, err);
      const result = await postgresProvider.search(enrichedQuery);
      return { ...result, expansionApplied: !!enrichedQuery.expandedTerms?.length };
    }
    throw err;
  }
}

export type { SearchHit, SearchProvider, SearchQuery, SearchResult } from "./types";
