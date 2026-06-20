// Batch K1 — Razorpay dispute webhook ingester.
// Razorpay POSTs dispute.* events (created / under_review / won / lost / closed).
// We verify HMAC SHA256 of the raw body using RAZORPAY_WEBHOOK_SECRET, then
// upsert into payment_disputes keyed by razorpay_dispute_id.
//
// Public endpoint (no auth) — security is HMAC verification only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const raw = await req.text();
  const expected = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  if (!signature || signature !== expected) {
    console.warn('dispute_webhook_bad_signature');
    return new Response('invalid signature', { status: 401 });
  }

  let payload: { event?: string; payload?: { dispute?: { entity?: Record<string, unknown> }; payment?: { entity?: Record<string, unknown> } } };
  try { payload = JSON.parse(raw); }
  catch { return new Response('invalid json', { status: 400 }); }

  const event = payload.event ?? '';
  if (!event.startsWith('dispute.')) return new Response('ignored', { status: 200 });

  const d = payload.payload?.dispute?.entity ?? {};
  const p = payload.payload?.payment?.entity ?? {};
  if (!d.id) return new Response('missing dispute id', { status: 400 });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Try to resolve order_id from payment notes
  const notes = (p.notes ?? {}) as Record<string, string>;
  const orderIdFromNotes = notes.order_id ?? null;

  const status = mapStatus(event);
  const row = {
    order_id: orderIdFromNotes,
    razorpay_payment_id: (d.payment_id as string) ?? (p.id as string) ?? '',
    razorpay_dispute_id: d.id as string,
    amount_paise: Number(d.amount ?? 0),
    currency: (d.currency as string) ?? 'INR',
    reason_code: (d.reason_code as string) ?? null,
    reason_description: (d.reason_description as string) ?? null,
    phase: ((d.phase as string) ?? 'chargeback') as string,
    status,
    respond_by: d.respond_by ? new Date(Number(d.respond_by) * 1000).toISOString() : null,
    raw_payload: { event, dispute: d, payment_id: p.id },
  };

  const { error } = await admin
    .from('payment_disputes')
    .upsert(row, { onConflict: 'razorpay_dispute_id' });
  if (error) {
    console.error('dispute_webhook_db_error', { msg: error.message });
    return new Response('db error', { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function mapStatus(event: string): 'open' | 'under_review' | 'won' | 'lost' | 'closed' {
  switch (event) {
    case 'dispute.created': return 'open';
    case 'dispute.under_review': return 'under_review';
    case 'dispute.won': return 'won';
    case 'dispute.lost': return 'lost';
    case 'dispute.closed': return 'closed';
    default: return 'open';
  }
}
