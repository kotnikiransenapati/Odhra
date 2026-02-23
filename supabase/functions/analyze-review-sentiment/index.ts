import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  topics?: string[];
  quality_score?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviews }: { reviews: ReviewInput[] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!reviews?.length) {
      throw new Error("Reviews array is required");
    }

    console.log("Analyzing sentiment for", reviews.length, "reviews");

    const systemPrompt = `You are an advanced content moderation AI for an Indian e-commerce marketplace "Odhra". 
Analyze each review comprehensively for:

1. **Sentiment** (positive/neutral/negative) with a confidence score from 0 to 1
2. **Quality Score** (0 to 1): How helpful/detailed is this review for other shoppers?
3. **Topics**: Extract 1-3 key topics mentioned (e.g., "quality", "delivery", "value", "packaging", "sizing")
4. **Flags** - detect these issues:
   - \`spam\` - Generic, copy-pasted, or bot-generated content
   - \`inappropriate\` - Profanity, hate speech, or offensive language (including Hindi/regional)
   - \`personal_attack\` - Attacks on seller/delivery person
   - \`promotional\` - Contains URLs, competitor mentions, or self-promotion
   - \`irrelevant\` - Not about the product (about delivery only, wrong product, etc.)
   - \`suspicious\` - Keyword stuffing, overly generic praise, or review farming patterns
   - \`fake_positive\` - Suspiciously glowing review with no substance (rating 5 but empty/generic)
   - \`fake_negative\` - Unreasonably negative with no specifics (rating 1 but no explanation)

Respond with JSON:
{
  "results": [
    {
      "reviewId": "id",
      "sentiment": "positive|neutral|negative",
      "score": 0.85,
      "quality_score": 0.7,
      "topics": ["quality", "value"],
      "flags": [],
      "shouldFlag": false,
      "reason": "Brief explanation if flagged"
    }
  ]
}

IMPORTANT: Be conservative with flagging. Real customers often write brief reviews. Only flag clearly problematic content. Consider Indian English writing styles and Hindi-English mixed text as normal.`;

    const reviewsText = reviews.map((r, i) => 
      `Review ${i + 1} (ID: ${r.reviewId}, Rating: ${r.rating}/5):
${r.title ? `Title: ${r.title}\n` : ''}Content: ${r.content || '(no text, rating only)'}`
    ).join('\n\n---\n\n');

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
          { role: "user", content: `Analyze these ${reviews.length} reviews:\n\n${reviewsText}` },
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

    // Store sentiment results back to the reviews table
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    for (const result of parsedContent.results) {
      try {
        await supabase
          .from('reviews')
          .update({
            sentiment: result.sentiment,
            sentiment_score: result.score,
            sentiment_flags: result.flags,
            quality_score: result.quality_score,
          })
          .eq('id', result.reviewId);
      } catch (e) {
        console.error(`Failed to update review ${result.reviewId} sentiment:`, e);
      }
    }

    console.log("Sentiment analysis complete:", {
      total: parsedContent.results.length,
      flagged: parsedContent.results.filter(r => r.shouldFlag).length,
      positive: parsedContent.results.filter(r => r.sentiment === 'positive').length,
      negative: parsedContent.results.filter(r => r.sentiment === 'negative').length,
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
