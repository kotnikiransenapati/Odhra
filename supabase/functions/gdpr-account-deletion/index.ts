// GDPR account deletion — soft-anonymizes the authenticated user's PII and deletes the auth user.
// Preserves order/invoice records (legal retention) but strips identifying fields.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const BodySchema = z.object({ confirm: z.literal('DELETE') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Confirmation required. Send { "confirm": "DELETE" }.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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

    // Block deletion if user is an active vendor or admin (must be off-boarded first)
    const { data: vendor } = await admin.from('vendors').select('id').eq('user_id', userId).maybeSingle();
    if (vendor) {
      return new Response(
        JSON.stringify({ error: 'Active vendor account. Contact support to off-board first.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { data: adminUser } = await admin.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
    if (adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin account. Have another admin revoke access first.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const redacted = `deleted-${userId.slice(0, 8)}@anonymized.local`;

    // Anonymize profile (retain row to preserve FK integrity on historical records)
    await admin.from('profiles').update({
      email: redacted,
      full_name: 'Deleted User',
      avatar_url: null,
      phone: null,
    }).eq('id', userId);

    // Anonymize order shipping/billing snapshots (legal retention requires order rows kept)
    await admin.from('orders').update({
      shipping_address: { redacted: true },
      billing_address: { redacted: true },
      customer_email: redacted,
      customer_phone: null,
      customer_name: 'Deleted User',
    }).eq('customer_id', userId);

    // Best-effort cleanup of fully-personal rows
    const purge = [
      'carts', 'wishlists', 'push_subscriptions', 'cookie_consents',
      'whatsapp_preferences', 'email_preferences', 'notifications',
      'user_behavior_events', 'user_behavior_profiles', 'user_sessions',
    ];
    for (const t of purge) {
      await admin.from(t).delete().eq('user_id', userId);
    }

    // Audit
    await admin.from('audit_logs').insert({
      action: 'gdpr_account_deletion',
      entity_type: 'user',
      entity_id: userId,
      new_values: { redacted_at: new Date().toISOString() },
    });

    // Finally remove the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('auth delete failed', delErr);
      return new Response(JSON.stringify({ error: 'Failed to delete auth user', details: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Account deleted and PII anonymized.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('gdpr-account-deletion error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
