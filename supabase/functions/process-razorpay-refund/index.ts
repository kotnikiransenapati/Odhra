import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin permission
    const { data: isAdmin } = await supabase.rpc("admin_has_permission", {
      _user_id: user.id,
      _permission: "manage_refunds",
    });
    if (!isAdmin) throw new Error("Insufficient permissions");

    const body = await req.json();
    const { refund_id, action } = body;

    if (!refund_id) throw new Error("refund_id is required");

    // Fetch refund record
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .select("*")
      .eq("id", refund_id)
      .single();

    if (refundError || !refund) throw new Error("Refund not found");

    // Action: process_gateway — actually call Razorpay Refund API
    if (action === "process_gateway") {
      if (!refund.razorpay_payment_id) {
        throw new Error(
          "No Razorpay payment ID linked. This order may be COD or paid via another method."
        );
      }

      if (refund.status !== "approved") {
        throw new Error(`Cannot process refund in '${refund.status}' status. Must be 'approved'.`);
      }

      // Mark as processing
      await supabase
        .from("refunds")
        .update({ status: "processing", gateway_status: "initiated" })
        .eq("id", refund_id);

      // Call Razorpay Refund API
      const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      const refundAmountPaise = Math.round(refund.amount * 100);

      const refundPayload: Record<string, unknown> = {
        amount: refundAmountPaise,
        speed: refund.speed === "instant" ? "optimum" : "normal",
        notes: {
          refund_number: refund.refund_number,
          reason: refund.reason?.substring(0, 200) || "Customer refund",
        },
      };

      console.log(
        `Processing Razorpay refund for payment ${refund.razorpay_payment_id}, amount: ₹${refund.amount}`
      );

      const rpResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${refund.razorpay_payment_id}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${razorpayAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(refundPayload),
        }
      );

      const rpData = await rpResponse.json();

      if (!rpResponse.ok) {
        console.error("Razorpay refund failed:", rpData);
        await supabase
          .from("refunds")
          .update({
            gateway_status: "failed",
            gateway_response: rpData,
            status: "failed",
          })
          .eq("id", refund_id);

        // Log to audit
        await supabase.rpc("log_admin_action", {
          _action: "refund_gateway_failed",
          _entity_type: "refunds",
          _entity_id: refund_id,
          _new_values: { error: rpData.error?.description || "Unknown error" },
        });

        throw new Error(
          rpData.error?.description || "Razorpay refund failed"
        );
      }

      // Success — update refund with gateway data
      const gatewayStatus =
        rpData.status === "processed" ? "processed" : "pending";
      const isCompleted = rpData.status === "processed";

      await supabase
        .from("refunds")
        .update({
          razorpay_refund_id: rpData.id,
          gateway_status: gatewayStatus,
          gateway_response: rpData,
          status: isCompleted ? "completed" : "processing",
          transaction_id: rpData.id,
        })
        .eq("id", refund_id);

      // If refund came from a return request, update return status
      if (refund.return_request_id) {
        await supabase
          .from("return_requests")
          .update({ status: "refund_processed" })
          .eq("id", refund.return_request_id);
      }

      // Restore stock if full refund
      if (refund.refund_type === "full" && refund.order_id) {
        try {
          await supabase.rpc("restore_order_stock", {
            p_order_id: refund.order_id,
          });
        } catch (e) {
          console.error("Stock restore failed (non-critical):", e);
        }
      }

      // Audit log
      await supabase.rpc("log_admin_action", {
        _action: "refund_processed_via_razorpay",
        _entity_type: "refunds",
        _entity_id: refund_id,
        _new_values: {
          razorpay_refund_id: rpData.id,
          amount: refund.amount,
          gateway_status: gatewayStatus,
        },
      });

      console.log(
        `Razorpay refund ${rpData.id} created successfully (status: ${rpData.status})`
      );

      return new Response(
        JSON.stringify({
          success: true,
          razorpay_refund_id: rpData.id,
          gateway_status: gatewayStatus,
          message: isCompleted
            ? "Refund processed successfully"
            : "Refund initiated, awaiting processing by Razorpay",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: check_status — poll Razorpay for refund status update
    if (action === "check_status") {
      if (!refund.razorpay_refund_id || !refund.razorpay_payment_id) {
        throw new Error("No gateway refund to check");
      }

      const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      const statusResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${refund.razorpay_payment_id}/refunds/${refund.razorpay_refund_id}`,
        {
          headers: { Authorization: `Basic ${razorpayAuth}` },
        }
      );

      const statusData = await statusResponse.json();

      if (!statusResponse.ok) {
        throw new Error("Failed to fetch refund status from Razorpay");
      }

      const newGatewayStatus = statusData.status;
      const updates: Record<string, unknown> = {
        gateway_status: newGatewayStatus,
        gateway_response: statusData,
      };

      if (newGatewayStatus === "processed" && refund.status !== "completed") {
        updates.status = "completed";
      } else if (newGatewayStatus === "failed" && refund.status !== "failed") {
        updates.status = "failed";
      }

      await supabase.from("refunds").update(updates).eq("id", refund_id);

      return new Response(
        JSON.stringify({
          success: true,
          gateway_status: newGatewayStatus,
          razorpay_data: statusData,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: process_wallet — credit to customer wallet/store credit
    if (action === "process_wallet") {
      if (refund.status !== "approved") {
        throw new Error("Refund must be approved first");
      }

      // Add loyalty points as store credit
      await supabase.rpc("add_loyalty_points", {
        p_user_id: refund.customer_id,
        p_points: Math.floor(refund.amount),
        p_source: "refund_credit",
        p_description: `Store credit for refund ${refund.refund_number}`,
        p_reference_id: refund.order_id,
      });

      await supabase
        .from("refunds")
        .update({
          status: "completed",
          gateway_status: "wallet_credited",
        })
        .eq("id", refund_id);

      await supabase.rpc("log_admin_action", {
        _action: "refund_wallet_credit",
        _entity_type: "refunds",
        _entity_id: refund_id,
        _new_values: { amount: refund.amount, method: "wallet" },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `₹${refund.amount} credited to customer wallet`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("process-razorpay-refund error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
