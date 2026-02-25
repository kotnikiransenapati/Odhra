import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

// Generate Code128B barcode SVG for AWB / tracking numbers
function generateBarcodeSVG(text: string): string {
  if (!text) return "";
  const barWidth = 2;
  const height = 50;
  const chars = text.split("");
  // Simple visual barcode representation using alternating bars
  let bars = "";
  let x = 0;
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].charCodeAt(0);
    // Generate pseudo-random bar pattern from char code
    const pattern = [
      (code % 3) + 1,
      ((code >> 2) % 2) + 1,
      ((code >> 4) % 3) + 1,
      ((code >> 1) % 2) + 1,
      ((code >> 3) % 3) + 1,
    ];
    for (let j = 0; j < pattern.length; j++) {
      const w = pattern[j] * barWidth;
      if (j % 2 === 0) {
        bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`;
      }
      x += w;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${height + 20}" viewBox="0 0 ${x} ${height + 20}">
    ${bars}
    <text x="${x / 2}" y="${height + 15}" text-anchor="middle" font-family="monospace" font-size="11" fill="#000">${escapeHtml(text)}</text>
  </svg>`;
}

// Generate QR code SVG (simple module-based rendering)
function generateQRPlaceholderSVG(url: string): string {
  if (!url) return "";
  // Use a simple text-based QR placeholder with the URL encoded as a data matrix pattern
  const size = 100;
  const modules = 21;
  const cellSize = size / modules;
  let rects = "";
  
  // Generate a deterministic pattern from URL hash
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Finder patterns (top-left, top-right, bottom-left)
      const inFinderTL = row < 7 && col < 7;
      const inFinderTR = row < 7 && col >= modules - 7;
      const inFinderBL = row >= modules - 7 && col < 7;
      
      let isDark = false;
      if (inFinderTL || inFinderTR || inFinderBL) {
        const r = inFinderTL ? row : inFinderTR ? row : row - (modules - 7);
        const c = inFinderTL ? col : inFinderTR ? col - (modules - 7) : col;
        isDark = (r === 0 || r === 6 || c === 0 || c === 6) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      } else {
        // Data pattern from hash
        isDark = ((hash >> ((row * modules + col) % 31)) & 1) === 1;
      }
      
      if (isDark) {
        rects += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#fff"/>
    ${rects}
  </svg>`;
}

interface SlipRequest {
  sub_order_ids: string[];
  slip_type: "packing" | "delivery" | "shipping_label";
  weight?: string;
  dimensions?: { l: string; w: string; h: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);

    // Auth
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseUser.auth.getUser(token);
      userId = user?.id || null;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin or vendor
    const { data: adminData } = await supabase
      .from("admin_users").select("id").eq("user_id", userId).eq("is_active", true).limit(1);
    const isAdmin = adminData && adminData.length > 0;

    const { data: vendorData } = await supabase
      .from("vendors").select("id, brand_name, gstin, address").eq("user_id", userId).eq("is_active", true).limit(1);
    const isVendor = vendorData && vendorData.length > 0;

    if (!isAdmin && !isVendor) {
      return new Response(JSON.stringify({ error: "Admin or vendor access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SlipRequest = await req.json();
    const { sub_order_ids, slip_type, weight, dimensions } = body;

    if (!sub_order_ids?.length) throw new Error("sub_order_ids required");

    // Fetch sub-orders with items and order data
    const { data: subOrders, error: soError } = await supabase
      .from("sub_orders")
      .select(`
        id, sub_order_number, status, tracking_number, carrier, total_amount, subtotal, tax_amount,
        vendor_id, shipped_at, created_at,
        orders!inner(id, order_number, shipping_address, billing_address, payment_method, created_at, customer_id),
        order_items(id, product_title, product_image, quantity, unit_price, total_price, variant_options)
      `)
      .in("id", sub_order_ids);

    if (soError) throw soError;
    if (!subOrders?.length) throw new Error("No sub-orders found");

    // Authorization for vendors
    if (isVendor && !isAdmin) {
      const vendorId = vendorData![0].id;
      const unauthorized = subOrders.some((so: any) => so.vendor_id !== vendorId);
      if (unauthorized) {
        return new Response(JSON.stringify({ error: "Cannot access other vendor orders" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch vendor details for each sub-order
    const vendorIds = [...new Set(subOrders.map((so: any) => so.vendor_id).filter(Boolean))];
    const { data: vendors } = await supabase
      .from("vendors").select("id, brand_name, gstin, address, phone, email").in("id", vendorIds);
    const vendorMap = new Map((vendors || []).map((v: any) => [v.id, v]));

    // Fetch customer profiles
    const customerIds = [...new Set(subOrders.map((so: any) => so.orders?.customer_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name, email, phone").in("id", customerIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Fetch shiprocket shipment data if available
    const { data: shipments } = await supabase
      .from("shiprocket_shipments")
      .select("sub_order_id, awb_code, courier_name, weight, dimensions")
      .in("sub_order_id", sub_order_ids);
    const shipmentMap = new Map((shipments || []).map((s: any) => [s.sub_order_id, s]));

    // Generate HTML for all slips
    const slipPages = subOrders.map((so: any, pageIdx: number) => {
      const order = so.orders;
      const items = so.order_items || [];
      const vendor = vendorMap.get(so.vendor_id) || {};
      const customer = profileMap.get(order?.customer_id) || {};
      const shipment = shipmentMap.get(so.id);
      const shipAddr = order?.shipping_address || {};
      const awb = shipment?.awb_code || so.tracking_number || "";
      const courierName = shipment?.courier_name || so.carrier || "";
      const pkgWeight = shipment?.weight || weight || "";
      const pkgDims = shipment?.dimensions || dimensions || {};
      const trackingUrl = awb ? `https://track.aftership.com/${awb}` : "";

      const barcodeSvg = awb ? generateBarcodeSVG(awb) : "";
      const qrSvg = trackingUrl ? generateQRPlaceholderSVG(trackingUrl) : "";

      if (slip_type === "shipping_label") {
        return generateShippingLabel(so, order, shipAddr, vendor, customer, awb, courierName, pkgWeight, pkgDims, barcodeSvg, qrSvg);
      }

      const isPacking = slip_type === "packing";

      return `
      ${pageIdx > 0 ? '<div style="page-break-before:always"></div>' : ""}
      <div class="slip">
        <!-- Header -->
        <div class="slip-header">
          <div>
            <h1>${isPacking ? "📦 PACKING SLIP" : "🚚 DELIVERY SLIP"}</h1>
            <p class="slip-subtitle">${escapeHtml(so.sub_order_number)}</p>
          </div>
          <div class="slip-meta">
            <p><strong>Date:</strong> ${formatDate(so.created_at)}</p>
            <p><strong>Order:</strong> ${escapeHtml(order?.order_number || "")}</p>
            ${courierName ? `<p><strong>Courier:</strong> ${escapeHtml(courierName)}</p>` : ""}
            ${so.status ? `<p><strong>Status:</strong> <span class="status-badge">${escapeHtml(so.status)}</span></p>` : ""}
          </div>
        </div>

        <!-- AWB / Barcode Section -->
        ${awb ? `
        <div class="awb-section">
          <div class="awb-barcode">${barcodeSvg}</div>
          <div class="awb-details">
            <div class="awb-label">AWB / TRACKING</div>
            <div class="awb-number">${escapeHtml(awb)}</div>
            ${courierName ? `<div class="awb-courier">${escapeHtml(courierName.toUpperCase())}</div>` : ""}
          </div>
          ${qrSvg ? `<div class="qr-code">${qrSvg}<p class="qr-label">Scan to Track</p></div>` : ""}
        </div>` : ""}

        <!-- Addresses -->
        <div class="addr-row">
          <div class="addr-box from">
            <div class="addr-tag">FROM (SELLER)</div>
            <p class="addr-name">${escapeHtml(vendor.brand_name || "Odhra Marketplace")}</p>
            ${vendor.address ? `<p>${escapeHtml(typeof vendor.address === "string" ? vendor.address : JSON.stringify(vendor.address))}</p>` : ""}
            ${vendor.phone ? `<p>📞 ${escapeHtml(vendor.phone)}</p>` : ""}
            ${vendor.gstin ? `<p class="gstin">GSTIN: ${escapeHtml(vendor.gstin)}</p>` : ""}
          </div>
          <div class="addr-box to">
            <div class="addr-tag">TO (CUSTOMER)</div>
            <p class="addr-name">${escapeHtml(shipAddr.full_name || customer.full_name || "Customer")}</p>
            <p>${escapeHtml(shipAddr.address_line1 || "")}</p>
            ${shipAddr.address_line2 ? `<p>${escapeHtml(shipAddr.address_line2)}</p>` : ""}
            <p>${escapeHtml(shipAddr.city || "")}, ${escapeHtml(shipAddr.state || "")} — ${escapeHtml(shipAddr.pincode || "")}</p>
            ${shipAddr.phone ? `<p>📞 ${escapeHtml(shipAddr.phone)}</p>` : ""}
          </div>
        </div>

        <!-- Items -->
        <table class="items-tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Item Description</th>
              ${!isPacking ? '<th class="r">Qty</th><th class="r">Price</th>' : '<th class="c">Qty</th><th class="c">Picked ✓</th>'}
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, i: number) => {
              const variants = item.variant_options;
              const variantStr = variants && typeof variants === "object"
                ? Object.entries(variants).map(([k, v]) => `${k}: ${v}`).join(", ")
                : "";
              return `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <strong>${escapeHtml(item.product_title)}</strong>
                  ${variantStr ? `<br><span class="variant">${escapeHtml(variantStr)}</span>` : ""}
                </td>
                ${!isPacking
                  ? `<td class="r">${item.quantity}</td><td class="r">${formatPrice(Number(item.total_price || 0))}</td>`
                  : `<td class="c">${item.quantity}</td><td class="c">☐</td>`
                }
              </tr>`;
            }).join("")}
          </tbody>
        </table>

        <!-- Package & Totals -->
        <div class="bottom-row">
          <div class="pkg-info">
            <div class="pkg-title">PACKAGE DETAILS</div>
            <p>Weight: <strong>${escapeHtml(String(pkgWeight || "—"))} kg</strong></p>
            <p>Dimensions: <strong>${escapeHtml(String(pkgDims.l || "—"))} × ${escapeHtml(String(pkgDims.w || "—"))} × ${escapeHtml(String(pkgDims.h || "—"))} cm</strong></p>
            <p>Items: <strong>${items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)} pcs</strong></p>
            <p>Payment: <strong>${escapeHtml(order?.payment_method === "cod" ? "COD — Collect ₹" + Number(so.total_amount || 0).toFixed(0) : "PREPAID")}</strong></p>
          </div>
          ${!isPacking ? `
          <div class="totals-mini">
            <div class="tot-row"><span>Subtotal</span><span>${formatPrice(Number(so.subtotal || 0))}</span></div>
            <div class="tot-row"><span>Tax</span><span>${formatPrice(Number(so.tax_amount || 0))}</span></div>
            <div class="tot-row grand"><span>Total</span><span>${formatPrice(Number(so.total_amount || 0))}</span></div>
          </div>` : ""}
        </div>

        <!-- Footer -->
        <div class="slip-footer">
          <p>Generated on ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN")} • Powered by ODHRA</p>
          ${isPacking ? "<p><em>Please verify all items are correctly packed before sealing.</em></p>" : ""}
        </div>
      </div>`;
    });

    const fullHtml = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${slip_type === "packing" ? "Packing" : slip_type === "shipping_label" ? "Shipping Label" : "Delivery"} Slip</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 12mm; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.4; }

  .slip { max-width: 210mm; margin: 0 auto; }

  /* Header */
  .slip-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111827; padding-bottom: 14px; margin-bottom: 16px; }
  .slip-header h1 { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: 1px; }
  .slip-subtitle { font-size: 14px; font-weight: 600; color: #6b7280; margin-top: 2px; font-family: monospace; }
  .slip-meta { text-align: right; font-size: 11px; }
  .slip-meta p { margin: 2px 0; }
  .status-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }

  /* AWB Section */
  .awb-section { display: flex; align-items: center; gap: 20px; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; }
  .awb-barcode { flex: 1; text-align: center; }
  .awb-barcode svg { max-width: 260px; height: auto; }
  .awb-details { flex-shrink: 0; }
  .awb-label { font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
  .awb-number { font-size: 20px; font-weight: 800; font-family: monospace; color: #111827; letter-spacing: 2px; }
  .awb-courier { font-size: 11px; font-weight: 700; color: #4b5563; margin-top: 2px; }
  .qr-code { flex-shrink: 0; text-align: center; }
  .qr-code svg { width: 80px; height: 80px; }
  .qr-label { font-size: 8px; color: #9ca3af; margin-top: 4px; }

  /* Addresses */
  .addr-row { display: flex; gap: 16px; margin-bottom: 16px; }
  .addr-box { flex: 1; border-radius: 8px; padding: 14px; font-size: 11px; }
  .addr-box.from { background: #f3f4f6; border-left: 4px solid #111827; }
  .addr-box.to { background: #fef3c7; border-left: 4px solid #d97706; }
  .addr-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 6px; }
  .addr-name { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
  .addr-box p { margin: 2px 0; color: #4b5563; }
  .gstin { font-family: monospace; font-size: 10px; color: #374151; margin-top: 4px; }

  /* Items Table */
  .items-tbl { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .items-tbl thead th { background: #111827; color: #fff; padding: 8px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; text-align: left; }
  .items-tbl thead th:first-child { border-radius: 6px 0 0 0; }
  .items-tbl thead th:last-child { border-radius: 0 6px 0 0; }
  .items-tbl tbody td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  .items-tbl .r { text-align: right; }
  .items-tbl .c { text-align: center; }
  .variant { font-size: 10px; color: #6b7280; }

  /* Bottom row */
  .bottom-row { display: flex; gap: 20px; margin-bottom: 16px; }
  .pkg-info { flex: 1; background: #f9fafb; border-radius: 8px; padding: 14px; border: 1px solid #e5e7eb; }
  .pkg-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
  .pkg-info p { margin: 3px 0; font-size: 11px; color: #4b5563; }
  .totals-mini { width: 220px; }
  .tot-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; color: #6b7280; }
  .tot-row.grand { border-top: 2px solid #111827; margin-top: 6px; padding-top: 8px; font-size: 14px; font-weight: 800; color: #111827; }

  /* Footer */
  .slip-footer { border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: center; }
  .slip-footer p { font-size: 9px; color: #9ca3af; margin: 2px 0; }

  /* Shipping Label specific */
  .label-page { width: 100mm; min-height: 150mm; border: 2px solid #000; margin: 0 auto; padding: 10px; }
  .label-page .label-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .label-page .label-header h2 { font-size: 16px; font-weight: 900; }
  .label-page .label-barcode { text-align: center; padding: 10px 0; border-bottom: 1px dashed #999; margin-bottom: 10px; }
  .label-page .label-barcode svg { max-width: 90%; }
  .label-page .label-addr { padding: 8px 0; border-bottom: 1px solid #ccc; margin-bottom: 8px; }
  .label-page .label-addr h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; }
  .label-page .label-addr p { font-size: 12px; margin: 2px 0; }
  .label-page .label-addr .big-name { font-size: 14px; font-weight: 800; }
  .label-page .label-addr .big-pin { font-size: 22px; font-weight: 900; letter-spacing: 3px; text-align: center; margin-top: 6px; }
  .label-page .label-meta { font-size: 10px; }
  .label-page .label-meta p { margin: 2px 0; }
  .label-page .label-cod { text-align: center; background: #000; color: #fff; padding: 6px; font-size: 16px; font-weight: 900; margin-top: 8px; border-radius: 4px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${slipPages.join("")}
</body></html>`;

    return new Response(
      JSON.stringify({
        success: true,
        html: fullHtml,
        count: subOrders.length,
        slip_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Delivery slip error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateShippingLabel(so: any, order: any, shipAddr: any, vendor: any, customer: any, awb: string, courierName: string, pkgWeight: string, pkgDims: any, barcodeSvg: string, qrSvg: string): string {
  const isCOD = order?.payment_method === "cod";
  return `
  <div class="label-page">
    <div class="label-header">
      <h2>${escapeHtml(courierName || "COURIER")}</h2>
      <p style="font-size:10px;color:#666;">${escapeHtml(so.sub_order_number)}</p>
    </div>

    ${barcodeSvg ? `<div class="label-barcode">${barcodeSvg}</div>` : ""}

    <div class="label-addr">
      <h3>📦 Ship To</h3>
      <p class="big-name">${escapeHtml(shipAddr.full_name || customer.full_name || "")}</p>
      <p>${escapeHtml(shipAddr.address_line1 || "")}</p>
      ${shipAddr.address_line2 ? `<p>${escapeHtml(shipAddr.address_line2)}</p>` : ""}
      <p>${escapeHtml(shipAddr.city || "")}, ${escapeHtml(shipAddr.state || "")}</p>
      ${shipAddr.phone ? `<p>📞 ${escapeHtml(shipAddr.phone)}</p>` : ""}
      ${shipAddr.pincode ? `<div class="big-pin">${escapeHtml(shipAddr.pincode)}</div>` : ""}
    </div>

    <div class="label-addr">
      <h3>↩ Return To</h3>
      <p><strong>${escapeHtml(vendor.brand_name || "Odhra")}</strong></p>
      ${vendor.address ? `<p>${escapeHtml(typeof vendor.address === "string" ? vendor.address : "")}</p>` : ""}
      ${vendor.phone ? `<p>📞 ${escapeHtml(vendor.phone)}</p>` : ""}
    </div>

    <div class="label-meta">
      <p><strong>Order:</strong> ${escapeHtml(order?.order_number || "")}</p>
      <p><strong>Weight:</strong> ${escapeHtml(String(pkgWeight || "—"))} kg</p>
      <p><strong>Dims:</strong> ${escapeHtml(String(pkgDims.l || "—"))}×${escapeHtml(String(pkgDims.w || "—"))}×${escapeHtml(String(pkgDims.h || "—"))} cm</p>
      ${qrSvg ? `<div style="text-align:center;margin-top:6px;">${qrSvg}</div>` : ""}
    </div>

    ${isCOD ? `<div class="label-cod">COD: ₹${Number(so.total_amount || 0).toFixed(0)}</div>` : ""}
  </div>`;
}
