/**
 * Central search registry. Picks the active provider based on `env`, with a
 * safe fallback to Postgres so the app always functions even if the configured
 * provider is misconfigured at runtime.
 */
import { integrations } from "@/lib/env";
import { algoliaProvider } from "./providers/algolia";
import { meilisearchProvider } from "./providers/meilisearch";
import { postgresProvider } from "./providers/postgres";
import type { SearchProvider, SearchQuery, SearchResult } from "./types";

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
  try {
    return await searchProvider.search(query);
  } catch (err) {
    if (searchProvider.id !== "postgres") {
      // eslint-disable-next-line no-console
      console.warn(`[search] ${searchProvider.id} failed, falling back to postgres`, err);
      return postgresProvider.search(query);
    }
    throw err;
  }
}

export type { SearchHit, SearchProvider, SearchQuery, SearchResult } from "./types";
