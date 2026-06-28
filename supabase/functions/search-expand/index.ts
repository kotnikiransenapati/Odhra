// Semantic Search Query Expansion (DAI2)
// Uses Lovable AI Gateway to enrich a raw search query with synonyms /
// related terms + structured intent (category hint, price band). Results
// are cached in `search_query_expansions` for 30 days so popular queries
// avoid repeated LLM calls.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const MODEL = "google/gemini-2.5-flash";

interface ExpansionPayload {
  expanded_terms: string[];
  intent_category: string | null;
  intent_price_min: number | null;
  intent_price_max: number | null;
}

function normalize(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = (await req.json()) as { query?: string };
    const normalized = normalize(query ?? "");
    if (normalized.length < 2) {
      return new Response(JSON.stringify({ ok: false, reason: "query_too_short" }), { headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Cache lookup
    const { data: cached } = await supabase
      .from("search_query_expansions")
      .select("*")
      .eq("query_normalized", normalized)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      // best-effort hit counter
      supabase
        .from("search_query_expansions")
        .update({ hit_count: (cached.hit_count ?? 0) + 1 })
        .eq("id", cached.id)
        .then(() => {});
      return new Response(
        JSON.stringify({ ok: true, cached: true, expansion: pickExpansion(cached) }),
        { headers: corsHeaders }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, reason: "ai_unavailable" }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 2. LLM expansion (structured)
    const prompt = `You are a search query understander for an Indian e-commerce store selling snacks, fashion, beauty and lifestyle. Given a shopper's raw search query, output strict JSON describing:\n- expanded_terms: up to 8 short Indian-English synonyms / related product terms (lowercase, no duplicates, no brand names unless in the query).\n- intent_category: a single broad category guess (e.g. "snacks", "kurta", "skincare") or null if unclear.\n- intent_price_min / intent_price_max: integers in INR if the query implies a budget (e.g. "under 500", "around 1000"), else null.\nQuery: "${normalized}"`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "edge-fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Respond with strict minified JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("search-expand AI error", aiRes.status, text);
      return new Response(
        JSON.stringify({ ok: false, reason: "ai_error", status: aiRes.status }),
        { status: 200, headers: corsHeaders }
      );
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeParseExpansion(content);

    // 3. Cache (upsert in case of race)
    const { data: stored } = await supabase
      .from("search_query_expansions")
      .upsert(
        {
          query_normalized: normalized,
          expanded_terms: parsed.expanded_terms,
          intent_category: parsed.intent_category,
          intent_price_min: parsed.intent_price_min,
          intent_price_max: parsed.intent_price_max,
          model: MODEL,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "query_normalized" }
      )
      .select()
      .maybeSingle();

    return new Response(
      JSON.stringify({ ok: true, cached: false, expansion: pickExpansion(stored ?? parsed) }),
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("search-expand fatal", err);
    return new Response(
      JSON.stringify({ ok: false, reason: "exception", message: String(err?.message ?? err) }),
      { status: 200, headers: corsHeaders }
    );
  }
});

function pickExpansion(row: any): ExpansionPayload {
  return {
    expanded_terms: Array.isArray(row?.expanded_terms) ? row.expanded_terms.slice(0, 8) : [],
    intent_category: row?.intent_category ?? null,
    intent_price_min: row?.intent_price_min ?? null,
    intent_price_max: row?.intent_price_max ?? null,
  };
}

function safeParseExpansion(raw: string): ExpansionPayload {
  // Strip possible code fences
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    const terms = Array.isArray(obj.expanded_terms)
      ? obj.expanded_terms
          .map((t: unknown) => String(t).toLowerCase().trim())
          .filter((t: string) => t && t.length <= 40)
          .slice(0, 8)
      : [];
    return {
      expanded_terms: Array.from(new Set(terms)),
      intent_category: typeof obj.intent_category === "string" ? obj.intent_category : null,
      intent_price_min: numOrNull(obj.intent_price_min),
      intent_price_max: numOrNull(obj.intent_price_max),
    };
  } catch {
    return { expanded_terms: [], intent_category: null, intent_price_min: null, intent_price_max: null };
  }
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}
