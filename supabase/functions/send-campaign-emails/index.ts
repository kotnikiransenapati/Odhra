import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CampaignRequest {
  campaign_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify admin auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify caller is admin
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
  const userId = claimsData.claims.sub as string;

  // Verify admin role
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { campaign_id }: CampaignRequest = await req.json();

    if (!campaign_id) {
      throw new Error("campaign_id is required");
    }

    // Fetch campaign
    const { data: campaign, error: campError } = await supabase
      .from("notification_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      throw new Error("Campaign not found");
    }

    console.log(`Starting campaign: ${campaign.name} (segment: ${campaign.segment})`);

    // Mark campaign as sending
    await supabase.from("notification_campaigns").update({
      status: "sending",
      send_started_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    // Fetch target emails based on segment
    let emails: { id: string; email: string; full_name: string | null }[] = [];

    switch (campaign.segment) {
      case "all_customers": {
        const { data } = await supabase.from("profiles").select("id, email, full_name");
        emails = data || [];
        break;
      }
      case "wishlist_users": {
        const { data: wishlistUsers } = await supabase
          .from("wishlists")
          .select("user_id");
        if (wishlistUsers) {
          const userIds = [...new Set(wishlistUsers.map(w => w.user_id))];
          if (userIds.length > 0) {
            const { data } = await supabase
              .from("profiles")
              .select("id, email, full_name")
              .in("id", userIds);
            emails = data || [];
          }
        }
        break;
      }
      case "cart_abandonment": {
        const { data: cartUsers } = await supabase
          .from("carts")
          .select("user_id")
          .not("user_id", "is", null)
          .not("items", "eq", "[]");
        if (cartUsers) {
          const userIds = [...new Set(cartUsers.map(c => c.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data } = await supabase
              .from("profiles")
              .select("id, email, full_name")
              .in("id", userIds);
            emails = data || [];
          }
        }
        break;
      }
      case "first_time_buyers": {
        // Users with exactly 1 paid order in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: recentOrders } = await supabase
          .from("orders")
          .select("customer_id")
          .eq("payment_status", "paid")
          .gte("created_at", sevenDaysAgo.toISOString());
        if (recentOrders) {
          // Count orders per customer
          const orderCounts: Record<string, number> = {};
          recentOrders.forEach(o => {
            orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1;
          });
          const firstTimeIds = Object.entries(orderCounts)
            .filter(([, count]) => count === 1)
            .map(([id]) => id);
          if (firstTimeIds.length > 0) {
            const { data } = await supabase
              .from("profiles")
              .select("id, email, full_name")
              .in("id", firstTimeIds);
            emails = data || [];
          }
        }
        break;
      }
      case "repeat_customers": {
        const { data: allOrders } = await supabase
          .from("orders")
          .select("customer_id")
          .eq("payment_status", "paid");
        if (allOrders) {
          const orderCounts: Record<string, number> = {};
          allOrders.forEach(o => {
            orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1;
          });
          const repeatIds = Object.entries(orderCounts)
            .filter(([, count]) => count >= 3)
            .map(([id]) => id);
          if (repeatIds.length > 0) {
            const { data } = await supabase
              .from("profiles")
              .select("id, email, full_name")
              .in("id", repeatIds);
            emails = data || [];
          }
        }
        break;
      }
      case "high_value": {
        const { data: hvOrders } = await supabase
          .from("orders")
          .select("customer_id, total_amount")
          .eq("payment_status", "paid");
        if (hvOrders) {
          const spendMap: Record<string, number> = {};
          hvOrders.forEach(o => {
            spendMap[o.customer_id] = (spendMap[o.customer_id] || 0) + (o.total_amount || 0);
          });
          const highValueIds = Object.entries(spendMap)
            .filter(([, total]) => total >= 10000)
            .map(([id]) => id);
          if (highValueIds.length > 0) {
            const { data } = await supabase
              .from("profiles")
              .select("id, email, full_name")
              .in("id", highValueIds);
            emails = data || [];
          }
        }
        break;
      }
      case "inactive_30_days": {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Get all users
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, email, full_name");
        // Get users with recent orders
        const { data: recentOrderUsers } = await supabase
          .from("orders")
          .select("customer_id")
          .gte("created_at", thirtyDaysAgo.toISOString());
        const activeIds = new Set(recentOrderUsers?.map(o => o.customer_id) || []);
        emails = (allProfiles || []).filter(p => !activeIds.has(p.id));
        break;
      }
      default: {
        // Try to match a custom segment from customer_segments table
        const { data: segmentData } = await supabase
          .from("customer_segment_members")
          .select("user_id, customer_segments!inner(name)")
          .eq("customer_segments.name", campaign.segment);
        if (segmentData && segmentData.length > 0) {
          const userIds = segmentData.map(s => s.user_id);
          const { data } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIds);
          emails = data || [];
        } else {
          // Fallback: all customers
          const { data } = await supabase.from("profiles").select("id, email, full_name");
          emails = data || [];
        }
        break;
      }
    }

    // Deduplicate by email
    const seen = new Set<string>();
    const uniqueRecipients = emails.filter(e => {
      if (!e.email || seen.has(e.email)) return false;
      seen.add(e.email);
      return true;
    });

    console.log(`Found ${uniqueRecipients.length} recipients for segment: ${campaign.segment}`);

    if (uniqueRecipients.length === 0) {
      await supabase.from("notification_campaigns").update({
        status: "completed",
        send_completed_at: new Date().toISOString(),
        total_recipients: 0,
      }).eq("id", campaign_id);

      return new Response(JSON.stringify({ 
        success: true, sent: 0, failed: 0, message: "No recipients found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update total recipients
    await supabase.from("notification_campaigns").update({
      total_recipients: uniqueRecipients.length,
    }).eq("id", campaign_id);

    // Create log entries
    const logEntries = uniqueRecipients.map(r => ({
      campaign_id,
      user_id: r.id,
      email: r.email,
      status: "pending",
    }));

    // Insert in batches of 100
    for (let i = 0; i < logEntries.length; i += 100) {
      await supabase.from("email_campaign_logs").insert(logEntries.slice(i, i + 100));
    }

    // Send emails in batches
    let sentCount = 0;
    let failCount = 0;
    const BATCH_SIZE = 5; // Resend rate limit friendly
    const emailTemplate = campaign.email_template || "promotional_campaign";
    const SITE_URL = Deno.env.get("SITE_URL") || "https://odhra1.lovable.app";

    for (let i = 0; i < uniqueRecipients.length; i += BATCH_SIZE) {
      const batch = uniqueRecipients.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          try {
            const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                type: emailTemplate,
                to: recipient.email,
                data: {
                  customerName: recipient.full_name || "there",
                  title: campaign.title,
                  message: campaign.message,
                  headline: campaign.email_subject || campaign.title,
                  subtitle: campaign.message,
                  cta_text: "Shop Now",
                  cta_url: `${SITE_URL}/shop`,
                },
              }),
            });

            const resData = await emailRes.json();

            if (!emailRes.ok) {
              throw new Error(resData.error || `HTTP ${emailRes.status}`);
            }

            // Update log as sent
            await supabase
              .from("email_campaign_logs")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                resend_id: resData.data?.id || null,
              })
              .eq("campaign_id", campaign_id)
              .eq("user_id", recipient.id);

            return { success: true };
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Unknown error";

            // Update log as failed
            await supabase
              .from("email_campaign_logs")
              .update({
                status: "failed",
                error_message: errMsg,
              })
              .eq("campaign_id", campaign_id)
              .eq("user_id", recipient.id);

            return { success: false, error: errMsg };
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          sentCount++;
        } else {
          failCount++;
        }
      }

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < uniqueRecipients.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Update campaign as completed
    await supabase.from("notification_campaigns").update({
      status: "completed",
      sent_count: sentCount,
      fail_count: failCount,
      send_completed_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    console.log(`Campaign ${campaign.name} completed: ${sentCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failCount,
        total: uniqueRecipients.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign send error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
