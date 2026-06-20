/**
 * N3: Customer-Support Copilot — RAG Retriever
 * --------------------------------------------
 * Pulls relevant context for an incoming support question from:
 *   - Knowledge-Base articles (kb_articles)
 *   - Recent orders for the user
 *   - Open / recent tickets for the user
 *   - Product Q&A (product_questions / product_answers)
 *
 * Produces a grounded `Prompt` for the LLM (lovable AI gateway).
 * Includes a lightweight BM25-ish keyword ranker so we don't need embeddings
 * for v1 — embeddings can be plugged into `rankByVector()` later.
 */
import { supabase } from "@/integrations/supabase/client";

export type RetrievedChunk = {
  source: "kb" | "order" | "ticket" | "qa";
  id: string;
  title: string;
  body: string;
  score: number;
  url?: string;
};

export type CopilotPrompt = {
  system: string;
  user: string;
  context: RetrievedChunk[];
};

const STOP = new Set(["the","a","an","is","are","of","to","and","or","in","for","on","with","i","my","me","you","it","this","that"]);
function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(t => t && !STOP.has(t));
}
function keywordScore(query: string, doc: string): number {
  const q = tokenize(query); const d = tokenize(doc);
  if (!q.length || !d.length) return 0;
  const freq: Record<string, number> = {};
  for (const w of d) freq[w] = (freq[w] ?? 0) + 1;
  let score = 0;
  for (const w of q) score += Math.log(1 + (freq[w] ?? 0));
  return score / Math.sqrt(d.length);
}

async function retrieveKb(query: string, limit = 4): Promise<RetrievedChunk[]> {
  const { data } = await supabase
    .from("kb_articles")
    .select("id,title,content,slug,is_published")
    .eq("is_published", true)
    .limit(50);
  return (data ?? [])
    .map(a => ({
      source: "kb" as const, id: a.id, title: a.title,
      body: (a.content ?? "").slice(0, 1200),
      score: keywordScore(query, `${a.title}\n${a.content ?? ""}`),
      url: `/help/${a.slug}`,
    }))
    .sort((a, b) => b.score - a.score).slice(0, limit);
}

async function retrieveUserContext(userId: string, query: string): Promise<RetrievedChunk[]> {
  const out: RetrievedChunk[] = [];

  const { data: orders } = await supabase
    .from("orders").select("id,order_number,status,total_amount,created_at")
    .eq("customer_id", userId).order("created_at", { ascending: false }).limit(5);
  for (const o of (orders ?? []) as any[]) {
    out.push({
      source: "order", id: o.id,
      title: `Order ${o.order_number ?? o.id.slice(0,8)} (${o.status})`,
      body: `Total ₹${o.total_amount} placed on ${new Date(o.created_at).toLocaleDateString()}`,
      score: keywordScore(query, `${o.order_number} ${o.status}`),
    });
  }

  const { data: tickets } = await supabase
    .from("support_tickets").select("id,subject,status,priority,created_at")
    .eq("customer_id", userId).order("created_at", { ascending: false }).limit(5);
  for (const t of (tickets ?? []) as any[]) {
    out.push({
      source: "ticket", id: t.id,
      title: `Ticket: ${t.subject} (${t.status})`,
      body: `${t.priority ?? "normal"} priority, opened ${new Date(t.created_at).toLocaleDateString()}`,
      score: keywordScore(query, `${t.subject} ${t.status}`),
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

/** Compose the LLM prompt with grounded context + strict guardrails. */
export async function buildCopilotPrompt(opts: { query: string; userId?: string; locale?: string }): Promise<CopilotPrompt> {
  const [kb, userCtx] = await Promise.all([
    retrieveKb(opts.query, 4),
    opts.userId ? retrieveUserContext(opts.userId, opts.query) : Promise.resolve([] as RetrievedChunk[]),
  ]);
  const context = [...kb, ...userCtx];

  const system =
`You are a helpful, concise customer-support copilot for an Indian e-commerce store.
Rules:
- Answer ONLY using the provided CONTEXT. If the answer is not in context, say so and offer to create a ticket.
- Never invent order numbers, refund amounts, or policies.
- Reply in ${opts.locale ?? "English"}. Use a friendly, professional tone.
- Format: ≤120 words, bullet points when listing steps.
- Add a "Sources:" line referencing context indices used (e.g. [1], [2]).`;

  const ctxBlock = context.map((c, i) => `[${i + 1}] (${c.source}) ${c.title}\n${c.body}`).join("\n\n");
  const user =
`USER QUESTION:
${opts.query}

CONTEXT:
${ctxBlock || "(no context retrieved)"}`;

  return { system, user, context };
}

/** Call Lovable AI gateway with the grounded prompt. */
export async function askCopilot(prompt: CopilotPrompt, model = "google/gemini-2.5-flash"): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-chatbot", {
    body: {
      model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user",   content: prompt.user },
      ],
    },
  });
  if (error) throw error;
  return (data as any)?.reply ?? (data as any)?.message ?? "";
}
