// GDPR data export — returns all PII for the authenticated user as JSON
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.claims.sub as string;
    const admin = createClient(supabaseUrl, serviceKey);

    // Rate limit: 1 export per hour
    const { data: rl } = await admin.rpc('check_rate_limit', {
      p_identifier: userId,
      p_endpoint: 'gdpr-export',
      p_max_requests: 1,
      p_window_seconds: 3600,
    });
    if (rl && (rl as any).allowed === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in 1 hour.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tables = [
      'profiles', 'orders', 'sub_orders', 'order_items', 'addresses',
      'carts', 'wishlists', 'reviews', 'loyalty_points', 'loyalty_transactions',
      'points_redemptions', 'referrals', 'referral_codes', 'subscriptions',
      'return_requests', 'disputes', 'support_tickets', 'notifications',
      'push_subscriptions', 'cookie_consents', 'whatsapp_preferences',
      'email_preferences', 'achievements',
    ];

    const userColMap: Record<string, string> = {
      profiles: 'id',
      orders: 'customer_id',
      reviews: 'user_id',
      loyalty_points: 'user_id',
      loyalty_transactions: 'user_id',
      points_redemptions: 'user_id',
      referrals: 'referrer_id',
      referral_codes: 'user_id',
      subscriptions: 'user_id',
      carts: 'user_id',
      wishlists: 'user_id',
      return_requests: 'customer_id',
      disputes: 'customer_id',
      support_tickets: 'user_id',
      notifications: 'user_id',
      push_subscriptions: 'user_id',
      cookie_consents: 'user_id',
      whatsapp_preferences: 'user_id',
      email_preferences: 'user_id',
      achievements: 'user_id',
      addresses: 'user_id',
    };

    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: userId };
    for (const t of tables) {
      const col = userColMap[t];
      if (!col) continue;
      const { data, error } = await admin.from(t).select('*').eq(col, userId);
      if (!error) out[t] = data ?? [];
    }

    // sub_orders + order_items via order ids
    const orderIds = Array.isArray(out.orders) ? (out.orders as any[]).map((o) => o.id) : [];
    if (orderIds.length) {
      const { data: subs } = await admin.from('sub_orders').select('*').in('order_id', orderIds);
      out.sub_orders = subs ?? [];
      const subIds = (subs ?? []).map((s: any) => s.id);
      if (subIds.length) {
        const { data: items } = await admin.from('order_items').select('*').in('sub_order_id', subIds);
        out.order_items = items ?? [];
      }
    }

    return new Response(JSON.stringify(out, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="data-export-${userId}.json"`,
      },
    });
  } catch (e) {
    console.error('gdpr-data-export error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
