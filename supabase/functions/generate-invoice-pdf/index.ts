import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert number to Indian words
function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = "Rupees " + convert(rupees);
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  return result + " Only";
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    let userId: string | null = null;
    let isAdmin = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseUser.auth.getUser(token);
      userId = user?.id || null;
    }

    const { invoice_id, order_id } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user is admin
    if (userId) {
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1);
      isAdmin = (adminData && adminData.length > 0);
    }

    // Fetch invoice
    let invoice: any = null;
    if (invoice_id) {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoice_id)
        .single();
      if (error) throw new Error("Invoice not found");
      invoice = data;
    } else if (order_id) {
      // Get first invoice for the order
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", order_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (error) throw new Error("No invoice found for this order");
      invoice = data;
    } else {
      throw new Error("invoice_id or order_id required");
    }

    // Authorization: customer can only download their own invoices
    if (!isAdmin && userId !== invoice.customer_id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order details for payment info
    const { data: order } = await supabase
      .from("orders")
      .select("order_number, payment_method, payment_status, razorpay_payment_id, shipping_address, billing_address, created_at")
      .eq("id", invoice.order_id)
      .single();

    // Get customer profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", invoice.customer_id)
      .single();

    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const seller = invoice.seller_details || {};
    const buyer = invoice.buyer_details || {};
    const shippingAddr = invoice.shipping_address || order?.shipping_address || {};
    const billingAddr = invoice.billing_address || order?.billing_address || shippingAddr;
    const totalAmount = Number(invoice.total_amount || 0);
    const amountInWords = numberToWords(totalAmount);

    // Type labels
    const typeLabels: Record<string, string> = {
      sale: "TAX INVOICE",
      credit_note: "CREDIT NOTE",
      debit_note: "DEBIT NOTE",
      proforma: "PROFORMA INVOICE",
    };

    const invoiceHtml = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.4; }
  .invoice { max-width: 210mm; margin: 0 auto; padding: 0; }
  
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 20px; }
  .header-left h1 { font-size: 28px; font-weight: 800; color: #1a1a2e; letter-spacing: 3px; margin-bottom: 4px; }
  .header-left .subtitle { font-size: 14px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 1px; }
  .header-right { text-align: right; }
  .header-right .inv-number { font-size: 13px; font-weight: 700; color: #1a1a2e; }
  .header-right .inv-date { font-size: 11px; color: #666; margin-top: 2px; }
  .header-right .inv-type { display: inline-block; background: #1a1a2e; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 1px; margin-top: 6px; }

  /* Address blocks */
  .addresses { display: flex; gap: 20px; margin-bottom: 20px; }
  .addr-block { flex: 1; background: #f8f9fa; border-radius: 8px; padding: 14px; border-left: 4px solid #1a1a2e; }
  .addr-block.buyer { border-left-color: #22c55e; }
  .addr-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 6px; }
  .addr-name { font-size: 13px; font-weight: 700; color: #1a1a1a; }
  .addr-detail { font-size: 11px; color: #555; margin-top: 2px; }
  .addr-gstin { font-size: 10px; font-weight: 600; color: #1a1a2e; margin-top: 4px; font-family: monospace; }

  /* Shipping + billing */
  .ship-bill { display: flex; gap: 20px; margin-bottom: 20px; }
  .ship-block { flex: 1; background: #fafafa; border-radius: 8px; padding: 12px; border: 1px solid #e5e7eb; }

  /* Items table */
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .items-table thead th { background: #1a1a2e; color: #fff; padding: 10px 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  .items-table thead th:first-child { border-radius: 6px 0 0 0; }
  .items-table thead th:last-child { border-radius: 0 6px 0 0; text-align: right; }
  .items-table tbody td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 11px; }
  .items-table tbody tr:last-child td { border-bottom: none; }
  .items-table .text-right { text-align: right; }
  .items-table .text-center { text-align: center; }
  .items-table .mono { font-family: monospace; font-size: 10px; color: #666; }

  /* Totals */
  .totals-section { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .totals-box { width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 11px; }
  .total-row.grand { border-top: 2px solid #1a1a2e; margin-top: 8px; padding-top: 10px; font-size: 14px; font-weight: 800; color: #1a1a2e; }
  .total-label { color: #666; }
  .total-value { font-weight: 600; }

  /* Amount in words */
  .amount-words { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
  .amount-words-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #15803d; margin-bottom: 4px; }
  .amount-words-text { font-size: 12px; font-weight: 600; color: #166534; font-style: italic; }

  /* Payment info */
  .payment-info { display: flex; gap: 20px; margin-bottom: 20px; }
  .payment-block { flex: 1; background: #f8f9fa; border-radius: 8px; padding: 12px; }
  .payment-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #999; }
  .payment-value { font-size: 12px; font-weight: 600; color: #1a1a1a; margin-top: 2px; }

  /* Footer */
  .footer { border-top: 2px solid #eee; padding-top: 16px; text-align: center; }
  .footer p { font-size: 10px; color: #999; margin: 2px 0; }
  .footer .brand { font-size: 12px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; }

  /* Terms */
  .terms { background: #fafafa; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
  .terms h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; margin-bottom: 6px; }
  .terms p { font-size: 9px; color: #888; line-height: 1.5; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="invoice">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>ODHRA</h1>
      <div class="subtitle">Premium Marketplace</div>
    </div>
    <div class="header-right">
      <div class="inv-number">${escapeHtml(invoice.invoice_number)}</div>
      <div class="inv-date">Date: ${formatDate(invoice.issued_at || invoice.created_at)}</div>
      ${order?.order_number ? `<div class="inv-date">Order: ${escapeHtml(order.order_number)}</div>` : ""}
      <div class="inv-type">${typeLabels[invoice.invoice_type] || "INVOICE"}</div>
    </div>
  </div>

  <!-- Seller / Buyer -->
  <div class="addresses">
    <div class="addr-block">
      <div class="addr-label">From (Seller)</div>
      <div class="addr-name">${escapeHtml(seller.name || "Odhra Marketplace")}</div>
      ${seller.address ? `<div class="addr-detail">${escapeHtml(seller.address)}</div>` : ""}
      ${seller.gstin ? `<div class="addr-gstin">GSTIN: ${escapeHtml(seller.gstin)}</div>` : ""}
      ${seller.pan ? `<div class="addr-gstin">PAN: ${escapeHtml(seller.pan)}</div>` : ""}
    </div>
    <div class="addr-block buyer">
      <div class="addr-label">Bill To (Buyer)</div>
      <div class="addr-name">${escapeHtml(buyer.name || profile?.full_name || "Customer")}</div>
      ${profile?.email ? `<div class="addr-detail">${escapeHtml(profile.email)}</div>` : ""}
      ${profile?.phone ? `<div class="addr-detail">Phone: ${escapeHtml(profile.phone)}</div>` : ""}
      ${buyer.gstin ? `<div class="addr-gstin">GSTIN: ${escapeHtml(buyer.gstin)}</div>` : ""}
    </div>
  </div>

  <!-- Shipping / Billing Address -->
  <div class="ship-bill">
    <div class="ship-block">
      <div class="addr-label">Shipping Address</div>
      <div class="addr-name">${escapeHtml(shippingAddr.full_name || "")}</div>
      <div class="addr-detail">${escapeHtml(shippingAddr.address_line1 || "")}</div>
      ${shippingAddr.address_line2 ? `<div class="addr-detail">${escapeHtml(shippingAddr.address_line2)}</div>` : ""}
      <div class="addr-detail">${escapeHtml(shippingAddr.city || "")}, ${escapeHtml(shippingAddr.state || "")} - ${escapeHtml(shippingAddr.pincode || "")}</div>
      ${shippingAddr.phone ? `<div class="addr-detail">Phone: ${escapeHtml(shippingAddr.phone)}</div>` : ""}
    </div>
    <div class="ship-block">
      <div class="addr-label">Billing Address</div>
      <div class="addr-name">${escapeHtml(billingAddr.full_name || shippingAddr.full_name || "")}</div>
      <div class="addr-detail">${escapeHtml(billingAddr.address_line1 || shippingAddr.address_line1 || "")}</div>
      ${(billingAddr.address_line2 || shippingAddr.address_line2) ? `<div class="addr-detail">${escapeHtml(billingAddr.address_line2 || shippingAddr.address_line2)}</div>` : ""}
      <div class="addr-detail">${escapeHtml(billingAddr.city || shippingAddr.city || "")}, ${escapeHtml(billingAddr.state || shippingAddr.state || "")} - ${escapeHtml(billingAddr.pincode || shippingAddr.pincode || "")}</div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>HSN/SAC</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-center">Tax %</th>
        <th class="text-right">Tax Amt</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any, i: number) => {
        const unitPrice = Number(item.unit_price || 0);
        const qty = Number(item.qty || 1);
        const taxRate = Number(item.tax_rate || 18);
        const lineTotal = Number(item.total || unitPrice * qty);
        const taxAmt = lineTotal - (lineTotal / (1 + taxRate / 100));
        return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(item.description || "")}</strong></td>
        <td class="mono">${escapeHtml(item.hsn_code || "-")}</td>
        <td class="text-center">${qty}</td>
        <td class="text-right">${formatPrice(unitPrice)}</td>
        <td class="text-center">${taxRate}%</td>
        <td class="text-right">${formatPrice(taxAmt)}</td>
        <td class="text-right"><strong>${formatPrice(lineTotal)}</strong></td>
      </tr>`;
      }).join("")}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-section">
    <div class="totals-box">
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span class="total-value">${formatPrice(Number(invoice.subtotal || 0))}</span>
      </div>
      <div class="total-row">
        <span class="total-label">Tax (GST)</span>
        <span class="total-value">${formatPrice(Number(invoice.tax_amount || 0))}</span>
      </div>
      ${Number(invoice.discount_amount) > 0 ? `
      <div class="total-row">
        <span class="total-label">Discount</span>
        <span class="total-value" style="color:#22c55e;">-${formatPrice(Number(invoice.discount_amount))}</span>
      </div>` : ""}
      ${Number(invoice.shipping_amount) > 0 ? `
      <div class="total-row">
        <span class="total-label">Shipping</span>
        <span class="total-value">${formatPrice(Number(invoice.shipping_amount))}</span>
      </div>` : ""}
      <div class="total-row grand">
        <span>GRAND TOTAL</span>
        <span>${formatPrice(totalAmount)}</span>
      </div>
    </div>
  </div>

  <!-- Amount in Words -->
  <div class="amount-words">
    <div class="amount-words-label">Amount in Words</div>
    <div class="amount-words-text">${escapeHtml(amountInWords)}</div>
  </div>

  <!-- Payment Info -->
  <div class="payment-info">
    <div class="payment-block">
      <div class="payment-label">Payment Method</div>
      <div class="payment-value">${escapeHtml(
        order?.payment_method === "cod" ? "Cash on Delivery" :
        order?.payment_method === "razorpay" ? "Razorpay (Online)" :
        order?.payment_method === "stripe" ? "Stripe (Online)" :
        order?.payment_method || "Online Payment"
      )}</div>
    </div>
    <div class="payment-block">
      <div class="payment-label">Payment Status</div>
      <div class="payment-value" style="text-transform:capitalize;">${escapeHtml(
        invoice.status === "paid" ? "Paid" :
        order?.payment_status === "cod_pending" ? "COD — Pending" :
        order?.payment_status || invoice.status
      )}</div>
    </div>
    ${order?.razorpay_payment_id ? `
    <div class="payment-block">
      <div class="payment-label">Transaction ID</div>
      <div class="payment-value" style="font-family:monospace;font-size:10px;">${escapeHtml(order.razorpay_payment_id)}</div>
    </div>` : ""}
  </div>

  <!-- Terms -->
  <div class="terms">
    <h4>Terms & Conditions</h4>
    <p>
      1. Goods once sold are subject to our return policy (7 days from delivery).<br>
      2. This is a computer-generated invoice and does not require a physical signature.<br>
      3. E&OE — Errors and Omissions Excepted.<br>
      4. Subject to jurisdiction of the seller's registered state.
    </p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p class="brand">✨ ODHRA</p>
    <p>Thank you for shopping with us!</p>
    <p>This is a computer-generated document. No signature required.</p>
  </div>
</div>
</body></html>`;

    // Return the HTML which can be printed as PDF by the browser
    return new Response(
      JSON.stringify({
        success: true,
        html: invoiceHtml,
        invoice_number: invoice.invoice_number,
        filename: `${invoice.invoice_number}.pdf`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Invoice PDF error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
