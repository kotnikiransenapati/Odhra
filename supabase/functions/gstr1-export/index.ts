// Batch K4 — GSTR-1 CSV export (B2B + B2C invoices for a given month).
// Admin-only. Reads from invoices/orders and serializes the CBIC GSTR-1 layout
// segments: B2B, B2CL (>₹2.5L inter-state), B2CS (consolidated by state+rate).
//
// Pipeline:
//   1. Caller hits POST /functions/v1/gstr1-export with { year, month }.
//   2. We aggregate orders.placed_at within the window.
//   3. Output one ZIP-friendly multipart text response of CSVs.
//
// Security:
//   - Bearer JWT required; has_role('admin') enforced.
//   - PII (customer name) is included only in B2B segment per CBIC spec.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface OrderRow {
  id: string;
  order_number: string;
  placed_at: string;
  total: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  gstin: string | null;
  place_of_supply_state: string | null;
  customer_id: string | null;
  shipping_address: Record<string, unknown> | null;
}

interface OrderItemRow {
  order_id: string;
  hsn_code: string | null;
  gst_rate_percent: number | null;
  taxable_value: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  quantity: number;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: corsHeaders });

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: 'unauthorized' }, 401);
  const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
  if (!isAdmin) return json({ error: 'forbidden' }, 403);

  const body = await req.json().catch(() => ({})) as { year?: number; month?: number };
  const year = Number(body.year);
  const month = Number(body.month);
  if (!Number.isInteger(year) || year < 2017 || !Number.isInteger(month) || month < 1 || month > 12) {
    return json({ error: 'invalid_period' }, 400);
  }

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: orders, error: ordErr } = await admin.from('orders')
    .select('id, order_number, placed_at, total, cgst_amount, sgst_amount, igst_amount, cess_amount, gstin, place_of_supply_state, customer_id, shipping_address')
    .gte('placed_at', from.toISOString()).lt('placed_at', to.toISOString())
    .eq('payment_status', 'paid')
    .returns<OrderRow[]>();
  if (ordErr) return json({ error: ordErr.message }, 500);

  const ids = (orders ?? []).map((o) => o.id);
  let items: OrderItemRow[] = [];
  if (ids.length) {
    const { data: oi } = await admin.from('order_items')
      .select('order_id, hsn_code, gst_rate_percent, taxable_value, cgst_amount, sgst_amount, igst_amount, quantity')
      .in('order_id', ids).returns<OrderItemRow[]>();
    items = oi ?? [];
  }

  // ---- B2B: invoices where buyer GSTIN present ----
  const b2bRows: Array<Record<string, unknown>> = [];
  // ---- B2CL: inter-state, invoice value > ₹2.5L ----
  const b2clRows: Array<Record<string, unknown>> = [];
  // ---- B2CS aggregated by (state, rate) ----
  const b2csMap = new Map<string, { state: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number; cess: number }>();
  // ---- HSN summary aggregated by (hsn, rate) ----
  const hsnMap = new Map<string, { hsn: string; rate: number; qty: number; taxable: number; cgst: number; sgst: number; igst: number }>();

  for (const o of orders ?? []) {
    const lineItems = items.filter((i) => i.order_id === o.id);
    const isInterState = o.igst_amount > 0;
    const state = o.place_of_supply_state ?? '';

    if (o.gstin) {
      b2bRows.push({
        gstin: o.gstin,
        invoice_number: o.order_number,
        invoice_date: o.placed_at.slice(0, 10),
        invoice_value: o.total,
        place_of_supply: state,
        reverse_charge: 'N',
        invoice_type: 'Regular',
        rate: lineItems[0]?.gst_rate_percent ?? '',
        taxable_value: lineItems.reduce((s, i) => s + Number(i.taxable_value), 0).toFixed(2),
        cgst: Number(o.cgst_amount).toFixed(2),
        sgst: Number(o.sgst_amount).toFixed(2),
        igst: Number(o.igst_amount).toFixed(2),
        cess: Number(o.cess_amount).toFixed(2),
      });
    } else if (isInterState && Number(o.total) > 250000) {
      b2clRows.push({
        invoice_number: o.order_number,
        invoice_date: o.placed_at.slice(0, 10),
        invoice_value: o.total,
        place_of_supply: state,
        rate: lineItems[0]?.gst_rate_percent ?? '',
        taxable_value: lineItems.reduce((s, i) => s + Number(i.taxable_value), 0).toFixed(2),
        igst: Number(o.igst_amount).toFixed(2),
        cess: Number(o.cess_amount).toFixed(2),
      });
    } else {
      // B2CS: aggregate per (state, rate)
      for (const li of lineItems) {
        const rate = Number(li.gst_rate_percent ?? 0);
        const key = `${state}|${rate}`;
        const e = b2csMap.get(key) ?? { state, rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 };
        e.taxable += Number(li.taxable_value);
        e.cgst += Number(li.cgst_amount);
        e.sgst += Number(li.sgst_amount);
        e.igst += Number(li.igst_amount);
        b2csMap.set(key, e);
      }
    }

    for (const li of lineItems) {
      const hsn = li.hsn_code ?? 'UNCLASSIFIED';
      const rate = Number(li.gst_rate_percent ?? 0);
      const key = `${hsn}|${rate}`;
      const e = hsnMap.get(key) ?? { hsn, rate, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      e.qty += Number(li.quantity);
      e.taxable += Number(li.taxable_value);
      e.cgst += Number(li.cgst_amount);
      e.sgst += Number(li.sgst_amount);
      e.igst += Number(li.igst_amount);
      hsnMap.set(key, e);
    }
  }

  const b2csRows = Array.from(b2csMap.values()).map((e) => ({
    type: 'OE', place_of_supply: e.state, rate: e.rate,
    taxable_value: e.taxable.toFixed(2),
    cgst: e.cgst.toFixed(2), sgst: e.sgst.toFixed(2), igst: e.igst.toFixed(2), cess: e.cess.toFixed(2),
  }));
  const hsnRows = Array.from(hsnMap.values()).map((e) => ({
    hsn: e.hsn, description: '', uqc: 'NOS', quantity: e.qty,
    rate: e.rate, taxable_value: e.taxable.toFixed(2),
    cgst: e.cgst.toFixed(2), sgst: e.sgst.toFixed(2), igst: e.igst.toFixed(2),
  }));

  const period = `${year}${String(month).padStart(2, '0')}`;
  const payload = {
    period,
    b2b_csv: toCsv(b2bRows, ['gstin','invoice_number','invoice_date','invoice_value','place_of_supply','reverse_charge','invoice_type','rate','taxable_value','cgst','sgst','igst','cess']),
    b2cl_csv: toCsv(b2clRows, ['invoice_number','invoice_date','invoice_value','place_of_supply','rate','taxable_value','igst','cess']),
    b2cs_csv: toCsv(b2csRows, ['type','place_of_supply','rate','taxable_value','cgst','sgst','igst','cess']),
    hsn_csv: toCsv(hsnRows, ['hsn','description','uqc','quantity','rate','taxable_value','cgst','sgst','igst']),
    counts: { b2b: b2bRows.length, b2cl: b2clRows.length, b2cs: b2csRows.length, hsn: hsnRows.length },
  };
  return json(payload, 200);
});

function json(b: unknown, status = 200): Response {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
