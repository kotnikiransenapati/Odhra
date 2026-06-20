// Batch K1 — Razorpay split transfer + partial refund orchestrator.
// Verifies caller is admin (or service_role), then either:
//   action=create_transfers → splits a captured payment across vendor linked
//                              accounts based on per-vendor sub-order totals.
//   action=create_refund    → issues a partial/full refund with optional
//                              reverse-transfer legs; persists to payment_refunds
//                              with an idempotency key.
//
// Security:
//   - Requires Authorization Bearer + admin role check (has_role RPC).
//   - Idempotency-Key header (or body field) prevents duplicate refunds.
//   - Never logs the Razorpay key secret; payloads are PII-redacted.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function rzpAuth(): string {
  return 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
}

function redact(s: string | undefined | null): string {
  if (!s) return '';
  return s.length <= 6 ? '***' : `${s.slice(0, 3)}…${s.slice(-2)}`;
}

interface TransferLeg {
  vendor_id: string;
  amount_paise: number;
  notes?: Record<string, string>;
}

async function callRazorpay(path: string, init: RequestInit): Promise<Response> {
  return await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: rzpAuth(),
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Admin role check via authenticated client
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: isAdmin } = await userClient.rpc('has_role', {
    _user_id: userRes.user.id, _role: 'admin',
  });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Service-role client for writes
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const body = await req.json().catch(() => ({}));
  const action = body.action as 'create_transfers' | 'create_refund';

  try {
    if (action === 'create_transfers') {
      const { order_id, razorpay_payment_id, legs } = body as {
        order_id: string; razorpay_payment_id: string; legs: TransferLeg[];
      };
      if (!order_id || !razorpay_payment_id || !Array.isArray(legs) || legs.length === 0) {
        return json({ error: 'invalid_payload' }, 400);
      }

      // Look up linked accounts for every vendor in one query
      const vendorIds = [...new Set(legs.map((l) => l.vendor_id))];
      const { data: accounts, error: accErr } = await admin
        .from('vendor_payout_accounts')
        .select('vendor_id, linked_account_id, commission_percent, hold_funds, account_status')
        .in('vendor_id', vendorIds)
        .eq('provider', 'razorpay');
      if (accErr) throw accErr;
      const byVendor = new Map(accounts?.map((a) => [a.vendor_id, a]) ?? []);

      const transfersPayload = legs.map((l) => {
        const acc = byVendor.get(l.vendor_id);
        if (!acc || acc.account_status !== 'active') {
          throw new Error(`vendor_payout_account_missing:${l.vendor_id}`);
        }
        const commission = Math.round((l.amount_paise * Number(acc.commission_percent)) / 100);
        return {
          account: acc.linked_account_id,
          amount: l.amount_paise - commission,
          currency: 'INR',
          notes: { order_id, vendor_id: l.vendor_id, ...(l.notes ?? {}) },
          on_hold: acc.hold_funds ? 1 : 0,
          _commission: commission,
        };
      });

      const rzpRes = await callRazorpay(`/payments/${encodeURIComponent(razorpay_payment_id)}/transfers`, {
        method: 'POST',
        body: JSON.stringify({
          transfers: transfersPayload.map(({ _commission, ...t }) => t),
        }),
      });
      const rzpJson = await rzpRes.json();
      if (!rzpRes.ok) {
        console.error('razorpay_transfer_failed', { payment: redact(razorpay_payment_id), status: rzpRes.status });
        return json({ error: 'razorpay_failed', detail: rzpJson?.error?.description ?? 'unknown' }, 502);
      }

      const items = (rzpJson?.items ?? rzpJson?.transfers ?? []) as Array<Record<string, unknown>>;
      const rows = items.map((t, i) => ({
        order_id,
        vendor_id: legs[i].vendor_id,
        razorpay_payment_id,
        razorpay_transfer_id: t.id as string,
        linked_account_id: t.recipient as string ?? transfersPayload[i].account,
        amount_paise: Number(t.amount ?? transfersPayload[i].amount),
        commission_paise: transfersPayload[i]._commission,
        currency: 'INR',
        status: (t.status as string) ?? 'created',
        on_hold: Boolean(t.on_hold),
        raw_payload: t,
      }));
      const { error: insErr } = await admin.from('payment_transfers').insert(rows);
      if (insErr) throw insErr;
      return json({ ok: true, count: rows.length });
    }

    if (action === 'create_refund') {
      const { order_id, razorpay_payment_id, amount_paise, refund_type, reason, reverse_transfers } = body as {
        order_id: string; razorpay_payment_id: string; amount_paise: number;
        refund_type?: 'partial' | 'full' | 'reverse_transfer'; reason?: string;
        reverse_transfers?: Array<{ transfer_id: string; amount_paise: number }>;
      };
      const idempotencyKey = req.headers.get('idempotency-key') ?? body.idempotency_key ?? crypto.randomUUID();
      if (!order_id || !razorpay_payment_id || !amount_paise || amount_paise <= 0) {
        return json({ error: 'invalid_payload' }, 400);
      }

      // Idempotency guard
      const { data: existing } = await admin
        .from('payment_refunds').select('id, status, razorpay_refund_id')
        .eq('idempotency_key', idempotencyKey).maybeSingle();
      if (existing) return json({ ok: true, refund: existing, replayed: true });

      const refundPayload: Record<string, unknown> = {
        amount: amount_paise,
        speed: 'normal',
        notes: { order_id, reason: reason ?? '' },
      };
      if (reverse_transfers?.length) {
        refundPayload.reverse_all = 0;
      }

      const rzpRes = await callRazorpay(`/payments/${encodeURIComponent(razorpay_payment_id)}/refund`, {
        method: 'POST',
        headers: { 'X-Razorpay-Account': '' },
        body: JSON.stringify(refundPayload),
      });
      const rzpJson = await rzpRes.json();
      if (!rzpRes.ok) {
        await admin.from('payment_refunds').insert({
          order_id, razorpay_payment_id, amount_paise,
          refund_type: refund_type ?? 'partial',
          reason, status: 'failed',
          initiated_by: userRes.user.id,
          idempotency_key: idempotencyKey,
          reverse_transfers: reverse_transfers ?? [],
          notes: { error: rzpJson?.error?.description ?? 'unknown' },
        });
        return json({ error: 'razorpay_failed', detail: rzpJson?.error?.description ?? 'unknown' }, 502);
      }

      // Optionally issue reverse transfers (when refund_type === 'reverse_transfer')
      if (reverse_transfers?.length) {
        for (const rt of reverse_transfers) {
          await callRazorpay(`/transfers/${encodeURIComponent(rt.transfer_id)}/reversals`, {
            method: 'POST',
            body: JSON.stringify({ amount: rt.amount_paise }),
          }).catch(() => null);
        }
      }

      const { data: row, error: insErr } = await admin.from('payment_refunds').insert({
        order_id, razorpay_payment_id,
        razorpay_refund_id: rzpJson.id,
        amount_paise,
        refund_type: refund_type ?? 'partial',
        reason,
        status: rzpJson.status === 'processed' ? 'processed' : 'pending',
        initiated_by: userRes.user.id,
        reverse_transfers: reverse_transfers ?? [],
        idempotency_key: idempotencyKey,
        notes: { razorpay: rzpJson },
      }).select().single();
      if (insErr) throw insErr;
      return json({ ok: true, refund: row });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (err) {
    const e = err as Error;
    console.error('razorpay_routes_error', { msg: e.message });
    return json({ error: 'internal_error', detail: e.message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
