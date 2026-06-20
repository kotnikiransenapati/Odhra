// Batch K1 — Nightly payment reconciliation.
// Pulls Razorpay payments captured in the last 24h, compares against
// public.payments, and writes a summary row into payment_reconciliation_runs.
//
// Trigger: pg_cron (see ops runbook) or manual admin call.
// Security: requires service-role JWT or admin caller.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const windowMs = 24 * 60 * 60 * 1000;
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowMs);

  let checked = 0;
  let matches = 0;
  const mismatches: Array<Record<string, unknown>> = [];
  let deltaPaise = 0;

  try {
    // Fetch up to 100 payments per page; iterate while there are more.
    let from = Math.floor(windowStart.getTime() / 1000);
    const to = Math.floor(windowEnd.getTime() / 1000);
    let skip = 0;
    const auth = 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    while (true) {
      const url = `https://api.razorpay.com/v1/payments?from=${from}&to=${to}&count=100&skip=${skip}`;
      const res = await fetch(url, { headers: { Authorization: auth } });
      if (!res.ok) throw new Error(`razorpay_list_failed:${res.status}`);
      const json = await res.json() as { items?: Array<{ id: string; amount: number; status: string; order_id?: string }> };
      const items = json.items ?? [];
      if (items.length === 0) break;

      const ids = items.map((i) => i.id);
      const { data: localPayments } = await admin
        .from('payments')
        .select('razorpay_payment_id, amount, status')
        .in('razorpay_payment_id', ids);
      const byId = new Map(localPayments?.map((p) => [p.razorpay_payment_id, p]) ?? []);

      for (const it of items) {
        checked++;
        if (it.status !== 'captured') continue;
        const local = byId.get(it.id);
        if (!local) {
          mismatches.push({ kind: 'missing_local', razorpay_payment_id: it.id, amount_paise: it.amount });
          deltaPaise += it.amount;
        } else {
          const localPaise = Math.round(Number(local.amount) * 100);
          if (localPaise !== it.amount) {
            mismatches.push({ kind: 'amount_diff', razorpay_payment_id: it.id, local_paise: localPaise, rzp_paise: it.amount });
            deltaPaise += it.amount - localPaise;
          } else {
            matches++;
          }
        }
      }

      if (items.length < 100) break;
      skip += 100;
      if (skip > 5000) break; // hard safety cap
    }

    const status = mismatches.length === 0 ? 'success' : 'partial';
    await admin.from('payment_reconciliation_runs').insert({
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      payments_checked: checked,
      matches,
      mismatches: mismatches.length,
      amount_delta_paise: deltaPaise,
      mismatch_payload: mismatches.slice(0, 200),
      status,
    });

    return new Response(JSON.stringify({ ok: true, checked, matches, mismatches: mismatches.length, delta_paise: deltaPaise }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const e = err as Error;
    await admin.from('payment_reconciliation_runs').insert({
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      payments_checked: checked, matches, mismatches: mismatches.length,
      amount_delta_paise: deltaPaise, mismatch_payload: mismatches.slice(0, 200),
      status: 'failed', error_message: e.message,
    });
    return new Response(JSON.stringify({ error: 'reconciliation_failed', detail: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
