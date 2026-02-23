import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductContext {
  recentlyViewed?: string[];
  purchaseHistory?: string[];
  wishlistItems?: string[];
  currentCategory?: string;
  priceRange?: { min: number; max: number };
  currentProductId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, context, limit = 8, strategy = "hybrid" }: {
      userId?: string;
      context?: ProductContext;
      limit?: number;
      strategy?: "ai" | "collaborative" | "content" | "hybrid";
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Recommendations request:", { userId: userId || "anon", strategy, limit });

    // Fetch candidate products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        id, title, slug, price, compare_at_price, category_id, tags, avg_rating,
        sold_count, is_featured, stock,
        categories (name, slug),
        product_images (url, is_primary)
      `)
      .eq("is_active", true)
      .gt("stock", 0)
      .limit(100);

    if (productsError) throw new Error(`Products fetch: ${productsError.message}`);
    if (!products?.length) {
      return new Response(JSON.stringify({ recommendations: [], strategy: "empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------- Strategy 1: Collaborative Filtering -------
    let collaborativeIds: string[] = [];
    if ((strategy === "collaborative" || strategy === "hybrid") && userId) {
      // Find users who bought similar products -> what else they bought
      const { data: userOrders } = await supabase
        .from("order_items")
        .select("product_id, orders!inner(customer_id)")
        .eq("orders.customer_id", userId)
        .limit(50);

      const boughtProductIds = [...new Set(userOrders?.map(o => o.product_id).filter(Boolean) || [])];

      if (boughtProductIds.length > 0) {
        // Find other users who bought the same products
        const { data: similarUserItems } = await supabase
          .from("order_items")
          .select("product_id, orders!inner(customer_id)")
          .in("product_id", boughtProductIds.slice(0, 10))
          .neq("orders.customer_id", userId)
          .limit(200);

        const otherUserIds = [...new Set(similarUserItems?.map(i => (i.orders as any)?.customer_id).filter(Boolean) || [])];

        if (otherUserIds.length > 0) {
          // What else did those users buy?
          const { data: coItems } = await supabase
            .from("order_items")
            .select("product_id")
            .in("orders.customer_id", otherUserIds.slice(0, 20))
            .not("product_id", "in", `(${boughtProductIds.join(",")})`)
            .limit(50);

          // Count co-occurrence frequency
          const freq = new Map<string, number>();
          coItems?.forEach(i => {
            if (i.product_id) freq.set(i.product_id, (freq.get(i.product_id) || 0) + 1);
          });
          collaborativeIds = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => id);
        }
      }
    }

    // ------- Strategy 2: Content-Based Filtering -------
    let contentIds: string[] = [];
    if (strategy === "content" || strategy === "hybrid") {
      const currentProd = context?.currentProductId
        ? products.find(p => p.id === context.currentProductId)
        : null;
      const viewedIds = context?.recentlyViewed || [];
      const viewedProducts = products.filter(p => viewedIds.includes(p.id));

      // Build preference vector
      const prefCategories = new Set<string>();
      const prefTags = new Set<string>();
      let avgPrice = 0;
      let priceCount = 0;

      const seedProducts = currentProd ? [currentProd, ...viewedProducts] : viewedProducts;
      seedProducts.forEach(p => {
        if (p.category_id) prefCategories.add(p.category_id);
        (p.tags || []).forEach((t: string) => prefTags.add(t));
        avgPrice += p.price;
        priceCount++;
      });
      if (priceCount > 0) avgPrice /= priceCount;

      // Score each candidate
      const excluded = new Set([...(context?.recentlyViewed || []), ...(context?.purchaseHistory || []), context?.currentProductId].filter(Boolean));
      const scored = products
        .filter(p => !excluded.has(p.id))
        .map(p => {
          let score = 0;
          if (p.category_id && prefCategories.has(p.category_id)) score += 30;
          const tagOverlap = (p.tags || []).filter((t: string) => prefTags.has(t)).length;
          score += tagOverlap * 10;
          if (avgPrice > 0) {
            const priceDist = Math.abs(p.price - avgPrice) / avgPrice;
            score += Math.max(0, 20 - priceDist * 20);
          }
          score += Math.min((p.avg_rating || 0) * 4, 20);
          score += Math.min((p.sold_count || 0) / 10, 10);
          if (p.is_featured) score += 5;
          return { id: p.id, score };
        })
        .sort((a, b) => b.score - a.score);

      contentIds = scored.slice(0, limit).map(s => s.id);
    }

    // ------- Strategy 3: AI Recommendations -------
    let aiIds: string[] = [];
    if ((strategy === "ai" || strategy === "hybrid") && LOVABLE_API_KEY) {
      try {
        const productsSummary = products.slice(0, 50).map(p => {
          const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;
          return { id: p.id, title: p.title, price: p.price, category: category?.name, tags: p.tags, rating: p.avg_rating, soldCount: p.sold_count };
        });

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You are a recommendation engine. Given user context and products, return a JSON object: {"ids":["id1","id2",...]}. Only use IDs from the list. Return up to ${limit}.`,
              },
              {
                role: "user",
                content: `Context: ${JSON.stringify(context || {})}
Products: ${JSON.stringify(productsSummary)}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
          aiIds = (parsed.ids || parsed.recommendedIds || []).slice(0, limit);
        }
      } catch (e) {
        console.warn("AI recommendations failed, continuing with other strategies:", e);
      }
    }

    // ------- Hybrid Merge -------
    let finalIds: string[];
    if (strategy === "hybrid") {
      // Weighted merge: AI (40%), Content (35%), Collaborative (25%)
      const scoreMap = new Map<string, number>();
      const addScores = (ids: string[], weight: number) => {
        ids.forEach((id, idx) => {
          const positionScore = (ids.length - idx) / ids.length;
          scoreMap.set(id, (scoreMap.get(id) || 0) + positionScore * weight);
        });
      };
      addScores(aiIds, 0.4);
      addScores(contentIds, 0.35);
      addScores(collaborativeIds, 0.25);

      finalIds = [...scoreMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      // If not enough, pad with trending
      if (finalIds.length < limit) {
        const trending = products
          .filter(p => !finalIds.includes(p.id))
          .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
          .slice(0, limit - finalIds.length)
          .map(p => p.id);
        finalIds.push(...trending);
      }
    } else if (strategy === "collaborative") {
      finalIds = collaborativeIds;
    } else if (strategy === "content") {
      finalIds = contentIds;
    } else {
      finalIds = aiIds;
    }

    // Map back to full product objects
    const recommendations = finalIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, limit);

    console.log(`Generated ${recommendations.length} recommendations via ${strategy}`);

    return new Response(JSON.stringify({ recommendations, strategy, sources: { ai: aiIds.length, content: contentIds.length, collaborative: collaborativeIds.length } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
