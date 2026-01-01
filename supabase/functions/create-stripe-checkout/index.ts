import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

interface CreateCheckoutRequest {
  items: OrderItem[];
  shipping_address: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  customer_note?: string;
  success_url: string;
  cancel_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    const { items, shipping_address, customer_note, success_url, cancel_url }: CreateCheckoutRequest = await req.json();

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping_amount = 0;
    const tax_amount = Math.round(subtotal * 0.18);
    const total_amount = subtotal + shipping_amount + tax_amount;

    // Generate order number
    const { data: orderNumData, error: orderNumError } = await supabase.rpc("generate_order_number");
    if (orderNumError) throw orderNumError;
    const order_number = orderNumData;

    console.log(`Creating Stripe checkout for order ${order_number}, total: ${total_amount}`);

    // Get or create Stripe customer
    let customerId: string;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || shipping_address.full_name,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create line items for Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add tax as separate line item
    if (tax_amount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tax (18% GST)",
            images: [],
          },
          unit_amount: Math.round(tax_amount * 100),
        },
        quantity: 1,
      });
    }

    // Create order in database first (pending status)
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
        payment_provider: "stripe",
        currency: "USD",
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw orderError;
    }

    // Create sub-orders for each vendor
    const itemsByVendor: Record<string, OrderItem[]> = {};
    for (const item of items) {
      if (!itemsByVendor[item.vendor_id]) {
        itemsByVendor[item.vendor_id] = [];
      }
      itemsByVendor[item.vendor_id].push(item);
    }

    let vendorIndex = 1;
    for (const [vendor_id, vendorItems] of Object.entries(itemsByVendor)) {
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

      const { data: subOrderNum } = await supabase.rpc("generate_sub_order_number", {
        parent_order_number: order_number,
        vendor_index: vendorIndex,
      });

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

      if (subOrderError) throw subOrderError;

      for (const item of vendorItems) {
        await supabase.from("order_items").insert({
          sub_order_id: subOrder.id,
          product_id: item.product_id,
          product_title: item.title,
          product_image: item.image_url,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          variant_info: item.variant_info,
        });
      }

      vendorIndex++;
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${success_url}?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url,
      metadata: {
        order_id: order.id,
        order_number: order_number,
        user_id: user.id,
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "IN"],
      },
    });

    // Update order with Stripe session ID
    await supabase
      .from("orders")
      .update({ payment_id: session.id })
      .eq("id", order.id);

    console.log(`Stripe session created: ${session.id}`);

    return new Response(
      JSON.stringify({
        session_id: session.id,
        checkout_url: session.url,
        order_id: order.id,
        order_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in create-stripe-checkout:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
