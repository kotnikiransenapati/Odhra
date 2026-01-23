import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phone_number: string;
  template_name: string;
  template_params: Record<string, string>;
  user_id?: string;
  reference_type?: string;
  reference_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.log("WhatsApp credentials not configured, skipping message");
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { phone_number, template_name, template_params, user_id, reference_type, reference_id }: WhatsAppRequest = await req.json();

    // Get template from database
    const { data: template, error: templateError } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("name", template_name)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", template_name);
      return new Response(
        JSON.stringify({ success: false, error: "Template not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check user preferences if user_id provided
    if (user_id) {
      const { data: prefs } = await supabase
        .from("whatsapp_preferences")
        .select("*")
        .eq("user_id", user_id)
        .single();

      if (prefs) {
        const templateType = template.template_type;
        if (
          (templateType === "order_confirmation" && !prefs.order_notifications) ||
          (templateType.includes("shipping") && !prefs.shipping_notifications) ||
          (templateType.includes("delivery") && !prefs.shipping_notifications) ||
          (templateType.includes("return") && !prefs.return_notifications) ||
          (templateType.includes("refund") && !prefs.return_notifications) ||
          (templateType === "promotional" && !prefs.promotional_messages)
        ) {
          console.log("User opted out of this notification type");
          return new Response(
            JSON.stringify({ success: false, error: "User opted out" }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
    }

    // Build template components
    const components: any[] = [];
    
    if (template.variables && template.variables.length > 0) {
      const parameters = template.variables.map((varName: string, index: number) => ({
        type: "text",
        text: template_params[varName] || template_params[`${index + 1}`] || "",
      }));
      
      components.push({
        type: "body",
        parameters,
      });
    }

    // Send via Meta WhatsApp API
    const formattedPhone = phone_number.startsWith("+") ? phone_number.slice(1) : phone_number;
    
    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: template.template_id || template.name,
        language: { code: template.language || "en" },
        components: components.length > 0 ? components : undefined,
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    const result = await response.json();

    // Log the message
    const { error: logError } = await supabase.from("whatsapp_messages").insert({
      user_id,
      phone_number,
      template_id: template.id,
      message_type: "template",
      message_content: { template_name, template_params, whatsapp_response: result },
      meta_message_id: result.messages?.[0]?.id,
      status: response.ok ? "sent" : "failed",
      error_message: response.ok ? null : JSON.stringify(result.error),
      reference_type,
      reference_id,
      sent_at: response.ok ? new Date().toISOString() : null,
    });

    if (logError) {
      console.error("Failed to log message:", logError);
    }

    if (!response.ok) {
      console.error("WhatsApp API error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.error?.message || "Failed to send" }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: result.messages?.[0]?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
