import { supabase } from "@/integrations/supabase/client";

export interface SemanticExpansion {
  expanded_terms: string[];
  intent_category: string | null;
  intent_price_min: number | null;
  intent_price_max: number | null;
}

const MEM_CACHE = new Map<string, { exp: SemanticExpansion; ts: number }>();
const MEM_TTL = 10 * 60 * 1000;
const LS_PREFIX = "search_expand_v1:";

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();
}

function readLocal(key: string): SemanticExpansion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > 7 * 24 * 60 * 60 * 1000) return null;
    return parsed.exp as SemanticExpansion;
  } catch {
    return null;
  }
}

function writeLocal(key: string, exp: SemanticExpansion) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ exp, ts: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

/**
 * Returns an AI-assisted expansion for a search query.
 * Lookup order: in-memory → localStorage → public expansions table → edge function.
 * Returns null on any failure so callers can fall back to plain search.
 */
export async function expandSearchQuery(query: string): Promise<SemanticExpansion | null> {
  const normalized = normalize(query);
  if (normalized.length < 2) return null;

  const mem = MEM_CACHE.get(normalized);
  if (mem && Date.now() - mem.ts < MEM_TTL) return mem.exp;

  const local = readLocal(normalized);
  if (local) {
    MEM_CACHE.set(normalized, { exp: local, ts: Date.now() });
    return local;
  }

  // Read-through cache from DB (avoids edge call for popular queries)
  try {
    const { data } = await supabase
      .from("search_query_expansions")
      .select("expanded_terms, intent_category, intent_price_min, intent_price_max")
      .eq("query_normalized", normalized)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (data) {
      const exp: SemanticExpansion = {
        expanded_terms: data.expanded_terms ?? [],
        intent_category: data.intent_category ?? null,
        intent_price_min: data.intent_price_min ?? null,
        intent_price_max: data.intent_price_max ?? null,
      };
      MEM_CACHE.set(normalized, { exp, ts: Date.now() });
      writeLocal(normalized, exp);
      return exp;
    }
  } catch {
    /* swallow */
  }

  // Edge function fallback (LLM)
  try {
    const { data, error } = await supabase.functions.invoke("search-expand", {
      body: { query: normalized },
    });
    if (error || !data?.ok) return null;
    const exp = data.expansion as SemanticExpansion;
    MEM_CACHE.set(normalized, { exp, ts: Date.now() });
    writeLocal(normalized, exp);
    return exp;
  } catch {
    return null;
  }
}
