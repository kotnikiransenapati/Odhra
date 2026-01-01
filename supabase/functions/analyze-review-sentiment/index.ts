import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewInput {
  reviewId: string;
  content: string;
  rating: number;
  title?: string;
}

interface SentimentResult {
  reviewId: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  flags: string[];
  shouldFlag: boolean;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviews }: { reviews: ReviewInput[] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!reviews?.length) {
      throw new Error("Reviews array is required");
    }

    console.log("Analyzing sentiment for", reviews.length, "reviews");

    const systemPrompt = `You are a content moderation AI for an e-commerce marketplace. Analyze reviews for:

1. Sentiment (positive/neutral/negative) with a score from -1 to 1
2. Potential issues that require flagging:
   - Spam or fake reviews
   - Inappropriate language or profanity
   - Personal attacks or harassment
   - Promotional content or competitor mentions
   - Irrelevant content not about the product
   - Suspicious patterns (too generic, keyword stuffing)

For each review, respond with JSON in this exact format:
{
  "results": [
    {
      "reviewId": "id",
      "sentiment": "positive|neutral|negative",
      "score": 0.8,
      "flags": ["spam", "inappropriate"],
      "shouldFlag": true,
      "reason": "Brief explanation if flagged"
    }
  ]
}

Be conservative - only flag clearly problematic content. Most legitimate reviews should pass.`;

    const reviewsText = reviews.map((r, i) => 
      `Review ${i + 1} (ID: ${r.reviewId}, Rating: ${r.rating}/5):
${r.title ? `Title: ${r.title}\n` : ''}Content: ${r.content}`
    ).join('\n\n');

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
          { role: "user", content: `Analyze these reviews:\n\n${reviewsText}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
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
    
    let parsedContent: { results: SentimentResult[] };
    try {
      parsedContent = JSON.parse(content);
    } catch {
      console.error("Failed to parse sentiment response:", content);
      throw new Error("Failed to analyze reviews");
    }

    console.log("Sentiment analysis complete:", {
      total: parsedContent.results.length,
      flagged: parsedContent.results.filter(r => r.shouldFlag).length,
    });

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Review sentiment analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
