import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
  "Content-Type": "application/json",
};

const MODEL = "google/gemini-3-flash-preview";

type Mode = "admin_reply" | "customer_self_help";

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, ...extraHeaders } });
}

function cleanText(value: unknown, max = 4000) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function safeJson(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

function normalizeSuggestion(parsed: any) {
  const actions = Array.isArray(parsed.recommended_actions)
    ? parsed.recommended_actions.map((item: unknown) => cleanText(item, 120)).filter(Boolean).slice(0, 5)
    : [];

  const sentiment = ["positive", "neutral", "frustrated", "angry", "urgent"].includes(parsed.sentiment)
    ? parsed.sentiment
    : "neutral";

  const urgency = Number(parsed.urgency_score);

  return {
    summary: cleanText(parsed.summary, 700) || "Support context reviewed.",
    suggested_reply: cleanText(parsed.suggested_reply, 2500) || "Thanks for sharing the details. We’re checking this and will update you shortly.",
    sentiment,
    urgency_score: Number.isFinite(urgency) ? Math.max(0, Math.min(100, Math.round(urgency))) : 25,
    recommended_actions: actions,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const service = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ ok: false, error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const ticketId = cleanText(body.ticketId, 80);
    const mode: Mode = body.mode === "customer_self_help" ? "customer_self_help" : "admin_reply";
    const tone = cleanText(body.tone, 60) || "warm, concise, professional";
    if (!/^[0-9a-f-]{36}$/i.test(ticketId)) return json({ ok: false, error: "invalid_ticket" }, 400);

    const { data: ticket, error: ticketError } = await service
      .from("support_tickets")
      .select("id,user_id,subject,description,category,priority,status,order_id,created_at")
      .eq("id", ticketId)
      .maybeSingle();
    if (ticketError) throw ticketError;
    if (!ticket) return json({ ok: false, error: "ticket_not_found" }, 404);

    const { data: isSupportAdmin } = await service.rpc("admin_has_permission", {
      _user_id: user.id,
      _permission: "view_tickets",
    });
    const ownsTicket = ticket.user_id === user.id;
    if (!ownsTicket && !isSupportAdmin) return json({ ok: false, error: "forbidden" }, 403);
    if (mode === "admin_reply" && !isSupportAdmin) return json({ ok: false, error: "forbidden" }, 403);

    const { data: context, error: contextError } = isSupportAdmin
      ? await service.rpc("admin_ticket_copilot_context", { _ticket_id: ticketId })
      : await service
          .from("support_ticket_messages")
          .select("message,is_staff_reply,created_at")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true })
          .limit(20);
    if (contextError) throw contextError;

    if (!LOVABLE_API_KEY) {
      return json({ ok: false, error: "ai_unavailable", message: "AI is not configured for this workspace." }, 200);
    }

    const safeContext = isSupportAdmin
      ? context
      : {
          ticket: {
            subject: ticket.subject,
            description: ticket.description,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            created_at: ticket.created_at,
          },
          messages: context ?? [],
        };

    const system = mode === "admin_reply"
      ? "You are Odhra's senior customer support copilot. Draft truthful, policy-safe replies for human support agents. Never invent refund approvals, delivery dates, coupon codes, private customer data, or backend actions. If data is missing, say what to verify. Output strict JSON only."
      : "You are Odhra's customer self-help assistant. Give a concise helpful answer and recommend next steps. Never claim a human has taken action. Never reveal internal notes. Output strict JSON only.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "edge-fetch",
        "Content-Type": "application/json",
        ...(req.headers.get("X-Lovable-AIG-Run-ID") ? { "X-Lovable-AIG-Run-ID": req.headers.get("X-Lovable-AIG-Run-ID")! } : {}),
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Tone: ${tone}\nReturn JSON with keys summary, suggested_reply, sentiment (positive|neutral|frustrated|angry|urgent), urgency_score (0-100), recommended_actions (array of strings).\nTicket context: ${JSON.stringify(safeContext).slice(0, 16000)}`,
          },
        ],
        temperature: 0.25,
        response_format: { type: "json_object" },
      }),
    });

    const runId = aiRes.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("support-copilot AI error", aiRes.status, errorText.slice(0, 500));
      return json({ ok: false, error: aiRes.status === 429 ? "rate_limited" : aiRes.status === 402 ? "credits_exhausted" : "ai_error", status: aiRes.status }, 200, runId ? { "X-Lovable-AIG-Run-ID": runId } : {});
    }

    const aiJson = await aiRes.json();
    const suggestion = normalizeSuggestion(safeJson(aiJson?.choices?.[0]?.message?.content ?? "{}"));

    const { data: stored, error: insertError } = await service
      .from("ai_support_suggestions")
      .insert({
        ticket_id: ticketId,
        requested_by: user.id,
        source: mode === "admin_reply" ? "admin" : "customer",
        summary: suggestion.summary,
        suggested_reply: suggestion.suggested_reply,
        sentiment: suggestion.sentiment,
        urgency_score: suggestion.urgency_score,
        recommended_actions: suggestion.recommended_actions,
        model: MODEL,
        ai_run_id: runId ?? null,
        metadata: { mode, tone },
      })
      .select()
      .single();
    if (insertError) throw insertError;

    return json({ ok: true, suggestion: stored }, 200, runId ? { "X-Lovable-AIG-Run-ID": runId } : {});
  } catch (error) {
    console.error("support-copilot fatal", error);
    return json({ ok: false, error: "server_error", message: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});