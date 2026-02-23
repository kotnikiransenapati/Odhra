import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  price: z.number().positive(),
  variant_info: z.record(z.string()).nullable().optional(),
  title: z.string().min(1).max(500),
  image_url: z.string().url().optional().nullable(),
  vendor_id: z.string().uuid(),
});

const ShippingAddressSchema = z.object({
  full_name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  address_line1: z.string().min(5).max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().min(5).max(10),
  country: z.string().max(50).default('India'),
});

const PromoInfoSchema = z.object({
  promotion_id: z.string().uuid(),
  promotion_code: z.string(),
  discount_amount: z.number().min(0),
}).optional();

const GuestInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
}).optional();

const CreateOrderRequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1).max(50),
  shipping_address: ShippingAddressSchema,
  customer_note: z.string().max(500).optional(),
  promo_info: PromoInfoSchema,
  guest_info: GuestInfoSchema,
});

serve(async (req) => {
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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Auth: optional (supports guest checkout)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    // Parse and validate request body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = CreateOrderRequestSchema.parse(body);
    } catch (parseError) {
      if (parseError instanceof z.ZodError) {
        const errorMessages = parseError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
      throw parseError;
    }

    const { items, shipping_address, customer_note, promo_info, guest_info } = validatedData;

    if (!userId && !guest_info) {
      throw new Error("Authentication or guest info required");
    }

    if (items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Verify prices against database
    const productIds = items.map(item => item.product_id);
    const { data: dbProducts, error: productsError } = await supabase
      .from('products')
      .select('id, price, stock, is_active, vendor_id')
      .in('id', productIds);

    if (productsError || !dbProducts?.length) {
      throw new Error("Failed to verify products");
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    for (const item of items) {
      const dbProduct = productMap.get(item.product_id);
      if (!dbProduct) throw new Error(`Product ${item.product_id} not found`);
      if (!dbProduct.is_active) throw new Error(`Product ${item.product_id} is unavailable`);
      if (dbProduct.stock < item.quantity) throw new Error(`Insufficient stock for ${item.product_id}`);
      if (Math.abs(item.price - dbProduct.price) > 0.01) throw new Error("Price mismatch. Refresh cart.");
      if (item.vendor_id !== dbProduct.vendor_id) throw new Error("Vendor mismatch");
    }

    // Calculate totals with verified prices
    const subtotal = items.reduce((sum, item) => {
      const dbProduct = productMap.get(item.product_id)!;
      return sum + dbProduct.price * item.quantity;
    }, 0);

    const discount_amount = promo_info?.discount_amount || 0;
    if (discount_amount > subtotal) throw new Error("Discount exceeds subtotal");

    const shipping_amount = 0;
    const discounted_subtotal = subtotal - discount_amount;
    const tax_amount = Math.round(discounted_subtotal * 0.18);
    const total_amount = discounted_subtotal + shipping_amount + tax_amount;

    if (total_amount < 1) throw new Error("Order total must be at least ₹1");

    // Generate order number
    const { data: order_number, error: orderNumError } = await supabase.rpc("generate_order_number");
    if (orderNumError) throw orderNumError;

    console.log(`Creating prepaid order ${order_number}, total: ${total_amount}, user: ${userId || 'guest'}`);

    // Create Razorpay order
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify({
        amount: total_amount * 100,
        currency: "INR",
        receipt: order_number,
        notes: { customer_id: userId || 'guest', order_number },
      }),
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
        customer_id: userId,
        order_number,
        shipping_address,
        subtotal,
        discount_amount,
        shipping_amount,
        tax_amount,
        total_amount,
        customer_note,
        promotion_id: promo_info?.promotion_id || null,
        promotion_code: promo_info?.promotion_code || null,
        payment_provider: "razorpay",
        payment_id: razorpayOrder.id,
        status: "pending",
        payment_status: "pending",
        guest_email: guest_info?.email || null,
        guest_phone: guest_info?.phone || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw orderError;
    }

    // Group items by vendor
    const itemsByVendor: Record<string, typeof items> = {};
    for (const item of items) {
      if (!itemsByVendor[item.vendor_id]) itemsByVendor[item.vendor_id] = [];
      itemsByVendor[item.vendor_id].push(item);
    }

    // Create sub-orders
    let vendorIndex = 1;
    for (const [vendor_id, vendorItems] of Object.entries(itemsByVendor)) {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("commission_rate")
        .eq("id", vendor_id)
        .single();

      const commission_rate = vendor?.commission_rate || 10;
      const vendor_subtotal = vendorItems.reduce((sum, item) => {
        const dbProduct = productMap.get(item.product_id)!;
        return sum + dbProduct.price * item.quantity;
      }, 0);
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
        const dbProduct = productMap.get(item.product_id)!;
        await supabase.from("order_items").insert({
          sub_order_id: subOrder.id,
          product_id: item.product_id,
          product_title: item.title,
          product_image: item.image_url,
          quantity: item.quantity,
          unit_price: dbProduct.price,
          total_price: dbProduct.price * item.quantity,
          variant_info: item.variant_info,
        });
      }

      vendorIndex++;
    }

    // Get prefill info
    let prefill = {
      name: shipping_address.full_name,
      email: guest_info?.email || '',
      contact: shipping_address.phone,
    };

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", userId)
        .single();
      if (profile) {
        prefill = {
          name: profile.full_name || shipping_address.full_name,
          email: profile.email || '',
          contact: profile.phone || shipping_address.phone,
        };
      }
    }

    console.log(`Order ${order_number} created successfully`);

    return new Response(
      JSON.stringify({
        razorpay_order_id: razorpayOrder.id,
        razorpay_key_id: RAZORPAY_KEY_ID,
        order_id: order.id,
        order_number,
        amount: total_amount,
        currency: "INR",
        prefill,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in create-razorpay-order:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
