import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, getClientKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PushSchema = z.object({
  action: z.enum(["send", "send-bulk", "schedule"]),
  user_id: z.string().uuid().optional(),
  user_ids: z.array(z.string().uuid()).max(10000).optional(),
  segment: z.enum(["all", "customers", "vendors", "high_value", "inactive"]).optional(),
  segment_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  url: z.string().max(2000).optional(),
  icon: z.string().max(2000).optional(),
  image_url: z.string().max(2000).optional(),
  badge: z.string().max(2000).optional(),
  tag: z.string().max(200).optional(),
  data: z.record(z.unknown()).optional(),
  scheduled_at: z.string().optional(),
  campaign_name: z.string().max(200).optional(),
  priority: z.enum(["normal", "high", "urgent"]).optional(),
});

interface PushRequest {
  action: "send" | "send-bulk" | "schedule";
  user_id?: string;
  user_ids?: string[];
  segment?: "all" | "customers" | "vendors" | "high_value" | "inactive";
  segment_id?: string; // custom segment from customer_segments table
  title: string;
  body: string;
  url?: string;
  icon?: string;
  image_url?: string; // rich media image
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  // Scheduling
  scheduled_at?: string; // ISO datetime — if set, creates a scheduled campaign
  campaign_name?: string;
  // Priority
  priority?: "normal" | "high" | "urgent";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await anonClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify admin
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Rate limit: 10 push sends per minute per admin
    const rlKey = getClientKey(req, user.id, "send_push");
    if (!(await checkRateLimit(rlKey, 10, 60, supabase))) {
      return rateLimitResponse(corsHeaders);
    }

    const parsed = PushSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation error", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = parsed.data;
    const {
      action,
      title,
      body: notifBody,
      url,
      image_url,
      data: extraData,
      priority = "normal",
      scheduled_at,
      campaign_name,
    } = body;

    // ── Schedule for later ──
    if (action === "schedule" && scheduled_at) {
      const { data: campaign, error: campErr } = await supabase
        .from("notification_campaigns")
        .insert({
          name: campaign_name || `Push: ${title}`,
          title,
          message: notifBody,
          segment: body.segment || "all",
          channel: "push",
          status: "scheduled",
          scheduled_at,
          created_by: user.id,
        })
        .select()
        .single();

      if (campErr) throw campErr;

      return new Response(
        JSON.stringify({
          success: true,
          scheduled: true,
          campaign_id: campaign.id,
          scheduled_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Resolve target user IDs ──
    let targetUserIds: string[] = [];

    if (action === "send" && body.user_id) {
      targetUserIds = [body.user_id];
    } else if (action === "send-bulk" || action === "send") {
      if (body.user_ids && body.user_ids.length > 0) {
        targetUserIds = body.user_ids;
      } else if (body.segment_id) {
        // Custom segment from customer_segments table
        const { data: members } = await supabase
          .from("customer_segment_members")
          .select("user_id")
          .eq("segment_id", body.segment_id);
        targetUserIds = members?.map((m) => m.user_id) || [];
      } else if (body.segment) {
        targetUserIds = await resolveSegment(supabase, body.segment);
      }
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No target users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build notification payload ──
    const notifData: Record<string, unknown> = {
      ...(extraData || {}),
      url: url || undefined,
      image_url: image_url || undefined,
      priority,
    };

    // Insert in-app notifications in batches of 200
    let notifCount = 0;
    const BATCH_SIZE = 200;

    for (let i = 0; i < targetUserIds.length; i += BATCH_SIZE) {
      const batch = targetUserIds.slice(i, i + BATCH_SIZE).map((userId) => ({
        user_id: userId,
        title,
        body: notifBody,
        type: "push",
        data: notifData,
      }));

      const { error } = await supabase.from("notifications").insert(batch);
      if (!error) notifCount += batch.length;
    }

    // Track campaign if named
    if (campaign_name) {
      await supabase.from("notification_campaigns").insert({
        name: campaign_name,
        title,
        message: notifBody,
        segment: body.segment || "custom",
        channel: "push",
        status: "sent",
        sent_count: notifCount,
        created_by: user.id,
      });
    }

    console.log(
      `Push notifications created for ${notifCount}/${targetUserIds.length} users | priority=${priority}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        sent: notifCount,
        total: targetUserIds.length,
        priority,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ── Segment resolution ──
async function resolveSegment(
  supabase: ReturnType<typeof createClient>,
  segment: string
): Promise<string[]> {
  switch (segment) {
    case "vendors": {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendor");
      return data?.map((v) => v.user_id) || [];
    }
    case "customers": {
      const { data: allProfiles } = await supabase.from("profiles").select("id");
      const { data: vendorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendor");
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const excludeIds = new Set([
        ...(vendorRoles?.map((v) => v.user_id) || []),
        ...(adminRoles?.map((a) => a.user_id) || []),
      ]);
      return (allProfiles || []).filter((p) => !excludeIds.has(p.id)).map((p) => p.id);
    }
    case "high_value": {
      // Users with > ₹5000 total orders
      const { data: orders } = await supabase
        .from("orders")
        .select("customer_id, total_amount")
        .eq("payment_status", "paid");
      if (!orders) return [];
      const spendByUser = new Map<string, number>();
      for (const o of orders) {
        spendByUser.set(o.customer_id, (spendByUser.get(o.customer_id) || 0) + o.total_amount);
      }
      return [...spendByUser.entries()]
        .filter(([, total]) => total >= 5000)
        .map(([id]) => id);
    }
    case "inactive": {
      // Users who haven't ordered in 60+ days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 60);
      const { data: recentBuyers } = await supabase
        .from("orders")
        .select("customer_id")
        .gte("created_at", cutoff.toISOString());
      const recentSet = new Set(recentBuyers?.map((o) => o.customer_id) || []);
      const { data: allProfiles } = await supabase.from("profiles").select("id");
      return (allProfiles || []).filter((p) => !recentSet.has(p.id)).map((p) => p.id);
    }
    default: {
      const { data: allProfiles } = await supabase.from("profiles").select("id");
      return allProfiles?.map((p) => p.id) || [];
    }
  }
}
