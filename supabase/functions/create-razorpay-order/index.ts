import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  product_id: string;
  quantity: number;
  variant_info?: Record<string, string> | null;
  title: string;
  price: number;
  image_url?: string;
  vendor_id: string;
}

interface CreateOrderRequest {
  items: OrderItem[];
  shipping_address: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  customer_note?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    const { items, shipping_address, customer_note }: CreateOrderRequest = await req.json();

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    if (!shipping_address) {
      throw new Error("Shipping address is required");
    }

    // Calculate order totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping_amount = 0; // Free shipping
    const tax_amount = Math.round(subtotal * 0.18); // 18% GST
    const total_amount = subtotal + shipping_amount + tax_amount;

    // Generate order number
    const { data: orderNumData, error: orderNumError } = await supabase.rpc("generate_order_number");
    if (orderNumError) throw orderNumError;
    const order_number = orderNumData;

    console.log(`Creating order ${order_number} for user ${user.id}, total: ${total_amount}`);

    // Create Razorpay order
    const razorpayOrderData = {
      amount: total_amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: order_number,
      notes: {
        customer_id: user.id,
        order_number: order_number,
      },
    };

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify(razorpayOrderData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay error:", errorText);
      throw new Error(`Failed to create Razorpay order: ${errorText}`);
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log(`Razorpay order created: ${razorpayOrder.id}`);

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        order_number,
        shipping_address,
        subtotal,
        shipping_amount,
        tax_amount,
        total_amount,
        customer_note,
        payment_provider: "razorpay",
        payment_id: razorpayOrder.id,
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw orderError;
    }

    // Group items by vendor
    const itemsByVendor: Record<string, OrderItem[]> = {};
    for (const item of items) {
      if (!itemsByVendor[item.vendor_id]) {
        itemsByVendor[item.vendor_id] = [];
      }
      itemsByVendor[item.vendor_id].push(item);
    }

    // Create sub-orders for each vendor
    let vendorIndex = 1;
    for (const [vendor_id, vendorItems] of Object.entries(itemsByVendor)) {
      // Get vendor commission rate
      const { data: vendor } = await supabase
        .from("vendors")
        .select("commission_rate")
        .eq("id", vendor_id)
        .single();

      const commission_rate = vendor?.commission_rate || 10;
      const vendor_subtotal = vendorItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const vendor_tax = Math.round(vendor_subtotal * 0.18);
      const vendor_total = vendor_subtotal + vendor_tax;
      const commission_amount = Math.round(vendor_total * (commission_rate / 100));
      const vendor_earnings = vendor_total - commission_amount;

      // Generate sub-order number
      const { data: subOrderNum } = await supabase.rpc("generate_sub_order_number", {
        parent_order_number: order_number,
        vendor_index: vendorIndex,
      });

      // Create sub-order
      const { data: subOrder, error: subOrderError } = await supabase
        .from("sub_orders")
        .insert({
          order_id: order.id,
          vendor_id,
          sub_order_number: subOrderNum,
          subtotal: vendor_subtotal,
          tax_amount: vendor_tax,
          total_amount: vendor_total,
          commission_rate,
          commission_amount,
          vendor_earnings,
          status: "pending",
        })
        .select()
        .single();

      if (subOrderError) {
        console.error("Sub-order creation error:", subOrderError);
        throw subOrderError;
      }

      // Create order items
      for (const item of vendorItems) {
        const { error: itemError } = await supabase.from("order_items").insert({
          sub_order_id: subOrder.id,
          product_id: item.product_id,
          product_title: item.title,
          product_image: item.image_url,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          variant_info: item.variant_info,
        });

        if (itemError) {
          console.error("Order item creation error:", itemError);
          throw itemError;
        }
      }

      vendorIndex++;
    }

    console.log(`Order ${order_number} created successfully with ${vendorIndex - 1} sub-orders`);

    // Get user profile for prefill
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single();

    return new Response(
      JSON.stringify({
        razorpay_order_id: razorpayOrder.id,
        razorpay_key_id: RAZORPAY_KEY_ID,
        order_id: order.id,
        order_number,
        amount: total_amount,
        currency: "INR",
        prefill: {
          name: profile?.full_name || shipping_address.full_name,
          email: profile?.email || user.email,
          contact: profile?.phone || shipping_address.phone,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in create-razorpay-order:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
