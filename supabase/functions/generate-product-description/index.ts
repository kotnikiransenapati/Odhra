import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductInput {
  title: string;
  category?: string;
  keywords?: string[];
  targetAudience?: string;
  features?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product }: { product: ProductInput } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!product?.title) {
      throw new Error("Product title is required");
    }

    console.log("Generating description for:", product.title);

    const systemPrompt = `You are an expert e-commerce copywriter specializing in luxury products. Generate compelling, SEO-optimized product descriptions.

Your descriptions should:
- Be engaging and persuasive
- Highlight key benefits and features
- Include relevant keywords naturally
- Appeal to the target audience
- Be scannable with clear structure
- Create desire and urgency

Format your response as JSON with these fields:
{
  "shortDescription": "A compelling 1-2 sentence summary (max 160 chars for SEO)",
  "fullDescription": "A detailed 2-3 paragraph description with benefits",
  "bulletPoints": ["5-7 key selling points"],
  "seoTitle": "SEO-optimized title (max 60 chars)",
  "seoDescription": "Meta description (max 160 chars)"
}`;

    const userPrompt = `Generate a product description for:
Title: ${product.title}
${product.category ? `Category: ${product.category}` : ''}
${product.keywords?.length ? `Keywords: ${product.keywords.join(', ')}` : ''}
${product.targetAudience ? `Target Audience: ${product.targetAudience}` : ''}
${product.features?.length ? `Features: ${product.features.join(', ')}` : ''}`;

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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to generate description");
    }

    console.log("Description generated successfully");

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Product description generator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
