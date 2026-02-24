import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!secretKey) throw new Error("RECAPTCHA_SECRET_KEY not configured");

    const { token, action, expectedAction } = await req.json();
    if (!token) throw new Error("Missing reCAPTCHA token");

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await res.json();

    const scoreThreshold = 0.5;
    const isValid =
      data.success === true &&
      data.score >= scoreThreshold &&
      (!expectedAction || data.action === expectedAction);

    return new Response(
      JSON.stringify({
        success: isValid,
        score: data.score,
        action: data.action,
        challenge_ts: data.challenge_ts,
        hostname: data.hostname,
        error_codes: data["error-codes"] || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("reCAPTCHA verify error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
