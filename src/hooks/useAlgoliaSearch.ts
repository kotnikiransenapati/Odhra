import { useState, useEffect, useCallback } from 'react';

// Algolia client configuration
const ALGOLIA_APP_ID = 'WPWCA46RAW';
const ALGOLIA_SEARCH_KEY = '73699fdff4acc97b1508ffa64121074c';
const ALGOLIA_INDEX_NAME = 'products';

// Lazy-initialized Algolia client — only created on first search
let searchClient: any = null;
let algoliaAvailable: boolean | null = null;

async function getSearchClient() {
  if (searchClient) return searchClient;
  try {
    const { algoliasearch } = await import('algoliasearch');
    searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    return searchClient;
  } catch {
    algoliaAvailable = false;
    return null;
  }
}

async function testAlgoliaIndex(): Promise<boolean> {
  if (algoliaAvailable === false) return false;
  if (algoliaAvailable === true) return true;

  try {
    const client = await getSearchClient();
    if (!client) return false;

    const response = await client.searchForHits({
      requests: [{ indexName: ALGOLIA_INDEX_NAME, query: '', hitsPerPage: 1 }],
    });
    algoliaAvailable = !!(response?.results?.[0]);
    return algoliaAvailable;
  } catch {
    algoliaAvailable = false;
    return false;
  }
}

export interface AlgoliaProduct {
  objectID: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  image?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  vendor_name?: string;
  vendor_slug?: string;
  rating: number;
  review_count: number;
  in_stock: boolean;
  discount_percentage: number;
}

export interface AlgoliaSearchResult {
  hits: AlgoliaProduct[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
}

export interface UseAlgoliaSearchOptions {
  hitsPerPage?: number;
  filters?: string;
  facetFilters?: string[][];
  numericFilters?: string[];
}

export function useAlgoliaSearch(options: UseAlgoliaSearchOptions = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AlgoliaSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { hitsPerPage = 24, filters, facetFilters, numericFilters } = options;

  const search = useCallback(async (searchQuery: string, page: number = 0) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isAvailable = await testAlgoliaIndex();
      if (!isAvailable) {
        throw new Error('Algolia index not available');
      }

      const client = await getSearchClient();
      if (!client) throw new Error('Algolia client not available');

      const response = await client.searchForHits({
        requests: [{
          indexName: ALGOLIA_INDEX_NAME,
          query: searchQuery,
          hitsPerPage,
          page,
          filters,
          facetFilters,
          numericFilters,
        }],
      });

      const result = response.results[0];
      
      setResults({
        hits: result.hits as unknown as AlgoliaProduct[],
        nbHits: result.nbHits || 0,
        page: result.page || 0,
        nbPages: result.nbPages || 0,
        hitsPerPage: result.hitsPerPage || hitsPerPage,
        processingTimeMS: result.processingTimeMS || 0,
        query: searchQuery,
      });
    } catch (err) {
      // Silently fail — search modal has Supabase fallback
      setError(err instanceof Error ? err : new Error('Search failed'));
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [hitsPerPage, filters, facetFilters, numericFilters]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        search(query);
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, search]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    search,
    clearSearch,
  };
}

// Hook for autocomplete suggestions — with graceful Algolia fallback
export function useAlgoliaAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AlgoliaProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!query.trim() || query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      try {
        const isAvailable = await testAlgoliaIndex();
        if (!isAvailable) {
          // Algolia unavailable — caller should use Supabase search instead
          setSuggestions([]);
          setIsLoading(false);
          return;
        }

        const client = await getSearchClient();
        if (!client) {
          setSuggestions([]);
          setIsLoading(false);
          return;
        }

        const response = await client.searchForHits({
          requests: [{
            indexName: ALGOLIA_INDEX_NAME,
            query,
            hitsPerPage: 6,
            attributesToRetrieve: ['title', 'slug', 'image', 'price', 'vendor_name', 'category'],
          }],
        });

        setSuggestions(response.results[0].hits as unknown as AlgoliaProduct[]);
      } catch {
        // Silently degrade — no autocomplete suggestions
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const clearSuggestions = useCallback(() => {
    setQuery('');
    setSuggestions([]);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    clearSuggestions,
  };
}

// Export for advanced use
export { ALGOLIA_INDEX_NAME };
