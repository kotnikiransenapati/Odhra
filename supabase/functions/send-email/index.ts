import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface EmailRequest {
  type: "order_confirmation" | "otp_verification" | "cart_abandonment" | "back_in_stock" | "welcome" | "shipping_update" | "order_delivered";
  to: string;
  data: Record<string, any>;
}

const getEmailTemplate = (type: string, data: Record<string, any>) => {
  switch (type) {
    case "order_confirmation":
      return {
        subject: `Order Confirmed - ${data.orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
                .content { padding: 40px; }
                .order-number { background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
                .order-number span { font-size: 24px; font-weight: bold; color: #1a1a2e; }
                .items { border-top: 1px solid #eee; padding-top: 20px; }
                .item { display: flex; padding: 15px 0; border-bottom: 1px solid #f0f0f0; }
                .total { font-size: 20px; font-weight: bold; text-align: right; padding-top: 20px; color: #1a1a2e; }
                .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
                .btn { display: inline-block; background: #1a1a2e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Thank you for your order!</h2>
                  <div class="order-number">
                    <p style="margin: 0 0 10px; color: #666;">Order Number</p>
                    <span>${data.orderNumber}</span>
                  </div>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>We're excited to confirm your order. You'll receive tracking information once your items ship.</p>
                  <div class="total">Total: ₹${data.total?.toLocaleString('en-IN') || '0'}</div>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.trackingUrl || '#'}" class="btn">Track Your Order</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Questions? Contact us at support@odhra.com</p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "otp_verification":
      return {
        subject: `Your Odhra Verification Code: ${data.otp}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
                .content { padding: 40px; text-align: center; }
                .otp-box { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 16px; margin: 30px 0; }
                .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #1a1a2e; font-family: 'Courier New', monospace; }
                .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
                .expires { color: #e74c3c; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Verify Your Email</h2>
                  <p>Enter this code to complete your verification:</p>
                  <div class="otp-box">
                    <div class="otp-code">${data.otp}</div>
                  </div>
                  <p class="expires">This code expires in 10 minutes</p>
                  <p style="color: #999; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
                </div>
                <div class="footer">
                  <p>© 2025 Odhra Marketplace</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "cart_abandonment":
      return {
        subject: "You left something behind ✨",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
                .content { padding: 40px; }
                .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
                .btn { display: inline-block; background: #1a1a2e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
                .discount { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">You left something in your cart!</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>We noticed you didn't complete your purchase. Your items are waiting for you!</p>
                  ${data.discountCode ? `
                    <div class="discount">
                      <p style="margin: 0 0 10px; font-size: 14px;">Use code below for 10% off</p>
                      <strong style="font-size: 24px; letter-spacing: 2px;">${data.discountCode}</strong>
                    </div>
                  ` : ''}
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.cartUrl || '#'}" class="btn">Complete Your Purchase</a>
                  </div>
                </div>
                <div class="footer">
                  <p>© 2025 Odhra Marketplace</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "back_in_stock":
      return {
        subject: `Good news! ${data.productName} is back in stock`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
                .content { padding: 40px; }
                .product { background: #f8f9fa; padding: 20px; border-radius: 12px; display: flex; gap: 20px; align-items: center; }
                .product img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; }
                .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
                .btn { display: inline-block; background: #1a1a2e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">It's Back! 🎉</h2>
                  <p>Great news! An item from your wishlist is back in stock.</p>
                  <div class="product">
                    ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}">` : ''}
                    <div>
                      <h3 style="margin: 0 0 10px;">${data.productName}</h3>
                      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1a1a2e;">₹${data.price?.toLocaleString('en-IN') || '0'}</p>
                    </div>
                  </div>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.productUrl || '#'}" class="btn">Shop Now</a>
                  </div>
                  <p style="color: #e74c3c; text-align: center; margin-top: 20px;">⚡ Limited stock available</p>
                </div>
                <div class="footer">
                  <p>© 2025 Odhra Marketplace</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "welcome":
      return {
        subject: "Welcome to Odhra ✨",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 60px 40px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 3px; }
                .header p { color: rgba(255,255,255,0.8); margin: 15px 0 0; }
                .content { padding: 40px; }
                .features { display: grid; gap: 20px; margin: 30px 0; }
                .feature { display: flex; gap: 15px; align-items: flex-start; }
                .feature-icon { width: 40px; height: 40px; background: #f8f9fa; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
                .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
                .btn { display: inline-block; background: #1a1a2e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                  <p>Your luxury marketplace awaits</p>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Welcome, ${data.name || 'there'}!</h2>
                  <p>Thank you for joining Odhra. We're thrilled to have you as part of our community.</p>
                  <div class="features">
                    <div class="feature">
                      <div class="feature-icon">🛍️</div>
                      <div>
                        <strong>Curated Selection</strong>
                        <p style="margin: 5px 0 0; color: #666;">Discover products from verified vendors</p>
                      </div>
                    </div>
                    <div class="feature">
                      <div class="feature-icon">🔒</div>
                      <div>
                        <strong>Secure Shopping</strong>
                        <p style="margin: 5px 0 0; color: #666;">Protected payments and buyer guarantee</p>
                      </div>
                    </div>
                    <div class="feature">
                      <div class="feature-icon">⚡</div>
                      <div>
                        <strong>Fast Delivery</strong>
                        <p style="margin: 5px 0 0; color: #666;">Quick shipping across India</p>
                      </div>
                    </div>
                  </div>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.shopUrl || '#'}" class="btn">Start Shopping</a>
                  </div>
                </div>
                <div class="footer">
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "shipping_update":
      return {
        subject: `Your order ${data.orderNumber} has shipped! 🚚`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
                .content { padding: 40px; }
                .tracking-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0; color: white; }
                .tracking-number { font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-top: 10px; }
                .timeline { margin: 30px 0; }
                .timeline-item { display: flex; gap: 15px; padding: 15px 0; }
                .timeline-dot { width: 20px; height: 20px; border-radius: 50%; background: #1a1a2e; flex-shrink: 0; }
                .timeline-dot.pending { background: #e0e0e0; }
                .timeline-dot.active { background: #27ae60; }
                .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
                .btn { display: inline-block; background: #1a1a2e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Your order is on its way! 🎉</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>Great news! Your order <strong>${data.orderNumber}</strong> has been shipped and is heading your way.</p>
                  
                  ${data.trackingNumber ? `
                    <div class="tracking-box">
                      <p style="margin: 0; opacity: 0.9;">Tracking Number</p>
                      <div class="tracking-number">${data.trackingNumber}</div>
                      ${data.carrier ? `<p style="margin: 10px 0 0; opacity: 0.8;">via ${data.carrier}</p>` : ''}
                    </div>
                  ` : ''}
                  
                  <div class="timeline">
                    <div class="timeline-item">
                      <div class="timeline-dot active"></div>
                      <div><strong>Order Placed</strong><br><span style="color: #666;">Confirmed</span></div>
                    </div>
                    <div class="timeline-item">
                      <div class="timeline-dot active"></div>
                      <div><strong>Shipped</strong><br><span style="color: #666;">In transit</span></div>
                    </div>
                    <div class="timeline-item">
                      <div class="timeline-dot pending"></div>
                      <div><strong>Delivered</strong><br><span style="color: #666;">Estimated ${data.estimatedDelivery || 'in 3-5 days'}</span></div>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.trackingUrl || '#'}" class="btn">Track Your Order</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Questions? Contact us at support@odhra.com</p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "order_delivered":
      return {
        subject: `Your order ${data.orderNumber} has been delivered! 📦`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 40px 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 50px 40px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
                .header .icon { font-size: 60px; margin-bottom: 15px; }
                .content { padding: 40px; }
                .order-summary { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 25px 0; }
                .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
                .btn { display: inline-block; background: #1a1a2e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 5px; }
                .btn-secondary { background: transparent; border: 2px solid #1a1a2e; color: #1a1a2e; }
                .rating-stars { font-size: 32px; letter-spacing: 5px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="icon">✅</div>
                  <h1>Delivered!</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Your order has arrived!</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>We're happy to let you know that your order <strong>${data.orderNumber}</strong> has been successfully delivered.</p>
                  
                  <div class="order-summary">
                    <p style="margin: 0 0 10px;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                    <p style="margin: 0 0 10px;"><strong>Delivered On:</strong> ${data.deliveredAt || 'Today'}</p>
                    <p style="margin: 0;"><strong>Total:</strong> ₹${data.total?.toLocaleString('en-IN') || '0'}</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #666;">How was your experience?</p>
                    <div class="rating-stars">⭐⭐⭐⭐⭐</div>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${data.reviewUrl || '#'}" class="btn">Write a Review</a>
                    <a href="${data.shopUrl || '#'}" class="btn btn-secondary">Shop More</a>
                  </div>
                  
                  <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    If you have any issues with your order, please contact us within 7 days for assistance.
                  </p>
                </div>
                <div class="footer">
                  <p>Thank you for shopping with Odhra! 💜</p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();

    if (!type || !to) {
      throw new Error("Email type and recipient are required");
    }

    console.log("Sending email:", { type, to });

    const template = getEmailTemplate(type, data);

    const emailResponse = await resend.emails.send({
      from: "Odhra <onboarding@resend.dev>", // Use your verified domain in production
      to: [to],
      subject: template.subject,
      html: template.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Email sending error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
