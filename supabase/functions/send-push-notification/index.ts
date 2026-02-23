import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushRequest {
  action: "send" | "send-bulk";
  // For single send
  user_id?: string;
  // For bulk send
  segment?: "all" | "customers" | "vendors";
  user_ids?: string[];
  // Notification content
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerId = claimsData.claims.sub as string;

  // Verify admin
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: callerId });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: PushRequest = await req.json();
    const { action, title, body: notifBody, url, icon, badge, tag, data } = body;

    if (!title || !notifBody) {
      throw new Error("title and body are required");
    }

    // Get target user IDs
    let targetUserIds: string[] = [];

    if (action === "send" && body.user_id) {
      targetUserIds = [body.user_id];
    } else if (action === "send-bulk") {
      if (body.user_ids && body.user_ids.length > 0) {
        targetUserIds = body.user_ids;
      } else if (body.segment) {
        switch (body.segment) {
          case "vendors": {
            const { data: vendorRoles } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("role", "vendor");
            targetUserIds = vendorRoles?.map(v => v.user_id) || [];
            break;
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
              ...(vendorRoles?.map(v => v.user_id) || []),
              ...(adminRoles?.map(a => a.user_id) || []),
            ]);
            targetUserIds = (allProfiles || []).filter(p => !excludeIds.has(p.id)).map(p => p.id);
            break;
          }
          default: {
            const { data: allProfiles } = await supabase.from("profiles").select("id");
            targetUserIds = allProfiles?.map(p => p.id) || [];
          }
        }
      }
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No target users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create in-app notifications for all target users
    const notifications = targetUserIds.map(userId => ({
      user_id: userId,
      title,
      body: notifBody,
      type: "push",
      data: (data || { url }) as Record<string, unknown>,
    }));

    // Insert in batches
    let notifCount = 0;
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      const { error } = await supabase.from("notifications").insert(batch);
      if (!error) notifCount += batch.length;
    }

    console.log(`Push notifications created for ${notifCount} users`);

    // Note: Actual Web Push (via VAPID) would require web-push library
    // For now, we use in-app notifications + browser Notification API on client side
    // The real-time subscription in useNotifications.ts will trigger browser notifications

    return new Response(
      JSON.stringify({
        success: true,
        sent: notifCount,
        total: targetUserIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
