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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, context, limit = 8 }: { userId?: string; context?: ProductContext; limit?: number } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Generating recommendations for user:", userId || "anonymous");

    // Fetch available products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        title,
        slug,
        price,
        compare_at_price,
        category_id,
        tags,
        avg_rating,
        sold_count,
        is_featured,
        categories (name, slug),
        product_images (url, is_primary)
      `)
      .eq("is_active", true)
      .limit(50);

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products?.length) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context for AI
    const productsSummary = products.map((p) => {
      const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;
      return {
        id: p.id,
        title: p.title,
        price: p.price,
        category: category?.name,
        tags: p.tags,
        rating: p.avg_rating,
        soldCount: p.sold_count,
        isFeatured: p.is_featured,
      };
    });

    const systemPrompt = `You are a personalized recommendation engine for a luxury e-commerce marketplace. 
    
Given the user context and available products, select the most relevant products to recommend.

Consider:
- User's browsing and purchase history
- Category preferences
- Price range preferences
- Product ratings and popularity
- Featured products
- Complementary products

Return a JSON array of product IDs in order of relevance:
{ "recommendedIds": ["id1", "id2", ...] }

Only return IDs from the available products. Return up to ${limit} recommendations.`;

    const userPrompt = `User Context:
${context?.recentlyViewed?.length ? `Recently viewed: ${context.recentlyViewed.join(', ')}` : 'No viewing history'}
${context?.purchaseHistory?.length ? `Purchase history: ${context.purchaseHistory.join(', ')}` : 'No purchases'}
${context?.wishlistItems?.length ? `Wishlist: ${context.wishlistItems.join(', ')}` : 'No wishlist'}
${context?.currentCategory ? `Currently browsing: ${context.currentCategory}` : ''}
${context?.priceRange ? `Price preference: ₹${context.priceRange.min} - ₹${context.priceRange.max}` : ''}

Available Products:
${JSON.stringify(productsSummary, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429 || status === 402) {
        // Fallback to basic recommendations
        console.log("AI unavailable, using fallback recommendations");
        const fallbackProducts = products
          .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || (b.sold_count || 0) - (a.sold_count || 0))
          .slice(0, limit);

        return new Response(JSON.stringify({ recommendations: fallbackProducts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let parsedContent: { recommendedIds: string[] };
    try {
      parsedContent = JSON.parse(content);
    } catch {
      console.error("Failed to parse recommendations:", content);
      throw new Error("Failed to generate recommendations");
    }

    // Map IDs back to full product data
    const recommendations = parsedContent.recommendedIds
      .map((id: string) => products.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, limit);

    console.log("Generated", recommendations.length, "recommendations");

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
