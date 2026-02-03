import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Base URL for the application - use production URL
const BASE_URL = Deno.env.get("SITE_URL") || "https://odhra1.lovable.app";

// URL Builder helper - generates proper links for emails
const buildUrl = {
  // Order tracking page
  orderTracking: (orderId: string) => `${BASE_URL}/orders/${orderId}`,
  
  // Customer orders list
  orders: () => `${BASE_URL}/account/orders`,
  
  // Order detail page
  orderDetail: (orderId: string) => `${BASE_URL}/account/orders/${orderId}`,
  
  // Product page
  product: (slug: string) => `${BASE_URL}/product/${slug}`,
  
  // Product review page (with product ID)
  productReview: (productId: string, orderId?: string) => 
    orderId ? `${BASE_URL}/product/${productId}?review=true&orderId=${orderId}` 
            : `${BASE_URL}/product/${productId}?review=true`,
  
  // Cart page
  cart: () => `${BASE_URL}/cart`,
  
  // Shop/browse page
  shop: (category?: string) => category ? `${BASE_URL}/shop?category=${category}` : `${BASE_URL}/shop`,
  
  // Spin wheel page
  spinWheel: () => `${BASE_URL}/spin-to-win`,
  
  // Customer support
  support: () => `${BASE_URL}/account/support`,
  
  // Contact page
  contact: () => `${BASE_URL}/contact`,
  
  // Account settings
  account: () => `${BASE_URL}/account`,
  
  // Email preferences/unsubscribe
  emailPreferences: () => `${BASE_URL}/account/email-preferences`,
  
  // Password reset - Note: Supabase handles the actual token URL, this is for custom scenarios
  passwordReset: (token?: string) => token ? `${BASE_URL}/reset-password#access_token=${token}&type=recovery` : `${BASE_URL}/reset-password`,
  
  // Auth page
  auth: () => `${BASE_URL}/auth`,
  
  // Vendor order (for vendor emails)
  vendorOrder: (subOrderId: string) => `${BASE_URL}/vendor/orders/${subOrderId}`,
  
  // Vendor dashboard
  vendorDashboard: () => `${BASE_URL}/vendor`,
  
  // Admin order
  adminOrder: (orderId: string) => `${BASE_URL}/admin?tab=orders&orderId=${orderId}`,
};

type EmailType = 
  | "order_confirmation" 
  | "otp_verification" 
  | "cart_abandonment" 
  | "back_in_stock" 
  | "welcome" 
  | "shipping_update" 
  | "order_delivered"
  | "promotional_campaign"
  | "flash_sale"
  | "price_drop"
  | "order_refunded"
  | "review_request"
  | "loyalty_reward"
  | "newsletter"
  | "spin_wheel_unlocked"
  | "password_reset"
  | "vendor_new_order"
  | "vendor_payout"
  | "ticket_reply"
  | "admin_new_order"
  | "vendor_order_update"
  | "admin_low_stock";

interface EmailRequest {
  type: EmailType;
  to: string;
  data: Record<string, any>;
}

// Common email styles
const baseStyles = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
  .content { padding: 40px; }
  .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  .btn { display: inline-block; background: #1a1a2e; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
  .btn-accent { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
  .btn-secondary { background: transparent; border: 2px solid #1a1a2e; color: #1a1a2e !important; }
  @media only screen and (max-width: 600px) {
    .container { margin: 0 10px; }
    .content { padding: 24px; }
    .header { padding: 30px 20px; }
  }
`;

const getEmailTemplate = (type: string, data: Record<string, any>) => {
  // Auto-generate URLs if not provided - ensures all links work properly
  const orderId = data.orderId || data.order_id;
  const productId = data.productId || data.product_id;
  const productSlug = data.productSlug || data.slug;
  
  // Build proper URLs - fallback to provided URLs or build from IDs
  const trackingUrl = data.trackingUrl || (orderId ? buildUrl.orderTracking(orderId) : buildUrl.orders());
  const ordersUrl = data.ordersUrl || buildUrl.orders();
  const orderDetailUrl = orderId ? buildUrl.orderDetail(orderId) : buildUrl.orders();
  const cartUrl = data.cartUrl || buildUrl.cart();
  const shopUrl = data.shopUrl || buildUrl.shop();
  const spinUrl = data.spinUrl || buildUrl.spinWheel();
  const productUrl = data.productUrl || (productSlug ? buildUrl.product(productSlug) : (productId ? buildUrl.product(productId) : shopUrl));
  const reviewUrl = data.reviewUrl || (productId ? buildUrl.productReview(productId, orderId) : shopUrl);
  const supportUrl = data.supportUrl || buildUrl.support();
  const contactUrl = data.contactUrl || buildUrl.contact();
  const unsubscribeUrl = data.unsubscribeUrl || buildUrl.emailPreferences();
  const preferencesUrl = data.preferencesUrl || buildUrl.emailPreferences();
  const passwordResetUrl = data.resetToken ? buildUrl.passwordReset(data.resetToken) : data.passwordResetUrl || buildUrl.auth();

  switch (type) {
    case "order_confirmation":
      return {
        subject: `Order Confirmed - ${data.orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .order-number { background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
                .order-number span { font-size: 24px; font-weight: bold; color: #1a1a2e; }
                .items { border-top: 1px solid #eee; padding-top: 20px; }
                .item { display: flex; padding: 15px 0; border-bottom: 1px solid #f0f0f0; }
                .total { font-size: 20px; font-weight: bold; text-align: right; padding-top: 20px; color: #1a1a2e; }
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
                  ${data.items ? `
                    <div class="items">
                      ${data.items.map((item: any) => `
                        <div style="display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                          ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">` : ''}
                          <div style="flex: 1;">
                            <p style="margin: 0 0 4px; font-weight: 600;">${item.title}</p>
                            <p style="margin: 0; color: #666; font-size: 14px;">Qty: ${item.quantity} × ₹${item.price?.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  <div class="total">Total: ₹${data.total?.toLocaleString('en-IN') || '0'}</div>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${trackingUrl}" class="btn">Track Your Order</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Questions? <a href="${contactUrl}" style="color: #1a1a2e;">Contact us</a></p>
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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .otp-box { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 16px; margin: 30px 0; }
                .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #1a1a2e; font-family: 'Courier New', monospace; text-align: center; }
                .expires { color: #e74c3c; font-weight: 600; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content" style="text-align: center;">
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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
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
                  ${data.items ? `
                    <div style="margin: 20px 0;">
                      ${data.items.slice(0, 3).map((item: any) => `
                        <div style="display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                          ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">` : ''}
                          <div>
                            <p style="margin: 0 0 4px; font-weight: 600;">${item.title}</p>
                            <p style="margin: 0; color: #1a1a2e; font-weight: bold;">₹${item.price?.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  ${data.discountCode ? `
                    <div class="discount">
                      <p style="margin: 0 0 10px; font-size: 14px;">Use code below for 10% off</p>
                      <strong style="font-size: 24px; letter-spacing: 2px;">${data.discountCode}</strong>
                    </div>
                  ` : ''}
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${cartUrl}" class="btn btn-accent">Complete Your Purchase</a>
                  </div>
                </div>
                <div class="footer">
                  <p><a href="${unsubscribeUrl}" style="color: #666;">Manage email preferences</a></p>
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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .product { background: #f8f9fa; padding: 20px; border-radius: 12px; display: flex; gap: 20px; align-items: center; }
                .product img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; }
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
                    <a href="${productUrl}" class="btn btn-accent">Shop Now</a>
                  </div>
                  <p style="color: #e74c3c; text-align: center; margin-top: 20px;">⚡ Limited stock available</p>
                </div>
                <div class="footer">
                  <p><a href="${unsubscribeUrl}" style="color: #666;">Manage email preferences</a></p>
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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .header-welcome { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 60px 40px; text-align: center; }
                .header-welcome h1 { color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 3px; }
                .header-welcome p { color: rgba(255,255,255,0.8); margin: 15px 0 0; }
                .feature { display: flex; gap: 15px; align-items: flex-start; margin-bottom: 20px; }
                .feature-icon { width: 40px; height: 40px; background: #f8f9fa; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header-welcome">
                  <h1>✨ ODHRA</h1>
                  <p>Your luxury marketplace awaits</p>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Welcome, ${data.name || 'there'}!</h2>
                  <p>Thank you for joining Odhra. We're thrilled to have you as part of our community.</p>
                  <div style="margin: 30px 0;">
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
                ${data.discountCode ? `
                    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                      <p style="margin: 0 0 8px; font-size: 14px;">Your welcome gift</p>
                      <strong style="font-size: 24px; letter-spacing: 2px;">${data.discountCode}</strong>
                      <p style="margin: 8px 0 0; font-size: 14px;">${data.discountDescription || 'Get 15% off your first order'}</p>
                    </div>
                  ` : ''}
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${shopUrl}" class="btn">Start Shopping</a>
                  </div>
                </div>
                <div class="footer">
                  <p><a href="${unsubscribeUrl}" style="color: #666;">Manage email preferences</a></p>
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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .tracking-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0; color: white; }
                .tracking-number { font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-top: 10px; }
                .timeline-item { display: flex; gap: 15px; padding: 15px 0; }
                .timeline-dot { width: 20px; height: 20px; border-radius: 50%; background: #1a1a2e; flex-shrink: 0; }
                .timeline-dot.pending { background: #e0e0e0; }
                .timeline-dot.active { background: #27ae60; }
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
                  
                  <div style="margin: 30px 0;">
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
                    <a href="${trackingUrl}" class="btn">Track Your Order</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Questions? <a href="${contactUrl}" style="color: #1a1a2e;">Contact us</a></p>
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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .header-success { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 50px 40px; text-align: center; }
                .header-success h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
                .header-success .icon { font-size: 60px; margin-bottom: 15px; }
                .order-summary { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 25px 0; }
                .rating-stars { font-size: 32px; letter-spacing: 5px; margin: 20px 0; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header-success">
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
                    <a href="${reviewUrl}" class="btn" style="margin: 5px;">Write a Review</a>
                    <a href="${shopUrl}" class="btn btn-secondary" style="margin: 5px;">Shop More</a>
                  </div>
                  
                  <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    If you have any issues with your order, <a href="${supportUrl}" style="color: #1a1a2e;">contact support</a> within 7 days for assistance.
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

    case "promotional_campaign":
      return {
        subject: data.subject || `Special Offer Just For You! ✨`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .hero { background: linear-gradient(135deg, ${data.heroColor || '#1a1a2e'} 0%, ${data.heroColorEnd || '#16213e'} 100%); padding: 60px 40px; text-align: center; color: white; }
                .hero h1 { font-size: 32px; margin: 0 0 10px; }
                .hero p { font-size: 18px; opacity: 0.9; margin: 0; }
                .promo-box { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 16px; text-align: center; margin: 30px 0; }
                .promo-code { font-size: 36px; font-weight: bold; letter-spacing: 4px; margin: 15px 0; }
                .products-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0; }
                .product-card { background: #f8f9fa; border-radius: 12px; padding: 16px; text-align: center; }
                .product-card img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="hero">
                  <h1>${data.title || 'Special Offer'}</h1>
                  <p>${data.subtitle || 'Exclusive deals just for you'}</p>
                </div>
                <div class="content">
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>${data.message || 'We have an amazing offer waiting for you!'}</p>
                  
                  ${data.promoCode ? `
                    <div class="promo-box">
                      <p style="margin: 0; font-size: 14px;">Use code</p>
                      <div class="promo-code">${data.promoCode}</div>
                      <p style="margin: 0; font-size: 16px;">${data.promoDescription || 'Get exclusive savings'}</p>
                      ${data.expiresAt ? `<p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">Expires: ${data.expiresAt}</p>` : ''}
                    </div>
                  ` : ''}
                  
                  ${data.products && data.products.length > 0 ? `
                    <h3 style="text-align: center; margin: 30px 0 20px;">Featured Products</h3>
                    <div class="products-grid">
                      ${data.products.slice(0, 4).map((product: any) => `
                        <div class="product-card">
                          ${product.image ? `<img src="${product.image}" alt="${product.title}">` : ''}
                          <p style="margin: 0 0 5px; font-weight: 600; font-size: 14px;">${product.title}</p>
                          <p style="margin: 0; color: #1a1a2e; font-weight: bold;">₹${product.price?.toLocaleString('en-IN')}</p>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.ctaUrl || shopUrl}" class="btn btn-accent">${data.ctaText || 'Shop Now'}</a>
                  </div>
                </div>
                <div class="footer">
                  <p style="font-size: 12px; color: #999;">You received this email because you're subscribed to Odhra promotions.</p>
                  <p><a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a></p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "flash_sale":
      return {
        subject: `⚡ FLASH SALE - ${data.discount || 'Up to 70% OFF'} - Ends Soon!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .flash-header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 50px 40px; text-align: center; color: white; }
                .flash-header h1 { font-size: 36px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 4px; }
                .countdown { display: flex; justify-content: center; gap: 15px; margin: 20px 0; }
                .countdown-item { background: rgba(255,255,255,0.2); padding: 15px 20px; border-radius: 10px; }
                .countdown-item span { display: block; font-size: 28px; font-weight: bold; }
                .countdown-item small { font-size: 12px; opacity: 0.8; }
                .urgency { background: #fff3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="flash-header">
                  <p style="margin: 0 0 10px; font-size: 16px;">⚡ LIMITED TIME ONLY ⚡</p>
                  <h1>FLASH SALE</h1>
                  <p style="font-size: 24px; font-weight: bold; margin: 15px 0;">${data.discount || 'Up to 70% OFF'}</p>
                  ${data.endsIn ? `
                    <div class="countdown">
                      <div class="countdown-item"><span>${data.endsIn.hours || '00'}</span><small>HOURS</small></div>
                      <div class="countdown-item"><span>${data.endsIn.minutes || '00'}</span><small>MINS</small></div>
                      <div class="countdown-item"><span>${data.endsIn.seconds || '00'}</span><small>SECS</small></div>
                    </div>
                  ` : ''}
                </div>
                <div class="content">
                  <div class="urgency">
                    <strong>⏰ Hurry!</strong> This sale ends ${data.endsAt || 'soon'}. Don't miss out!
                  </div>
                  
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>${data.message || 'Our biggest sale of the season is here! Shop now before it\'s too late.'}</p>
                  
                  ${data.categories ? `
                    <div style="margin: 25px 0;">
                      <h3>Featured Categories</h3>
                      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${data.categories.map((cat: string) => `
                          <span style="background: #f8f9fa; padding: 8px 16px; border-radius: 20px; font-size: 14px;">${cat}</span>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.saleUrl || shopUrl}" class="btn" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">Shop Flash Sale →</a>
                  </div>
                </div>
                <div class="footer">
                  <p style="font-size: 12px; color: #999;">Sale terms apply. While stocks last.</p>
                  <p><a href="${unsubscribeUrl}" style="color: #666;">Manage email preferences</a></p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "price_drop":
      return {
        subject: `Price Drop Alert! ${data.productName} is now ₹${data.newPrice?.toLocaleString('en-IN')} 📉`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .price-drop { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
                .old-price { text-decoration: line-through; opacity: 0.7; font-size: 18px; }
                .new-price { font-size: 32px; font-weight: bold; }
                .savings { background: #fff3cd; color: #856404; padding: 10px 20px; border-radius: 8px; display: inline-block; margin-top: 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #27ae60; margin-top: 0;">📉 Price Drop Alert!</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>Great news! An item on your wishlist just got a price drop!</p>
                  
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; display: flex; gap: 20px; align-items: center;">
                    ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;">` : ''}
                    <div>
                      <h3 style="margin: 0 0 10px;">${data.productName}</h3>
                      <div class="price-drop" style="margin: 0; padding: 15px;">
                        <span class="old-price">₹${data.oldPrice?.toLocaleString('en-IN')}</span>
                        <span class="new-price">₹${data.newPrice?.toLocaleString('en-IN')}</span>
                      </div>
                      <div class="savings">You save ₹${((data.oldPrice || 0) - (data.newPrice || 0)).toLocaleString('en-IN')}!</div>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.productUrl || '#'}" class="btn btn-accent">Buy Now at Lower Price</a>
                  </div>
                  
                  <p style="text-align: center; color: #e74c3c; margin-top: 20px; font-weight: 600;">
                    ⚠️ Price may change anytime. Act fast!
                  </p>
                </div>
                <div class="footer">
                  <p>© 2025 Odhra Marketplace</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "order_refunded":
      return {
        subject: `Refund Processed - Order ${data.orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .refund-box { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Refund Processed 💳</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>We've processed a refund for your order <strong>${data.orderNumber}</strong>.</p>
                  
                  <div class="refund-box">
                    <p style="margin: 0 0 10px; opacity: 0.9;">Refund Amount</p>
                    <p style="font-size: 32px; font-weight: bold; margin: 0;">₹${data.refundAmount?.toLocaleString('en-IN')}</p>
                    ${data.refundMethod ? `<p style="margin: 10px 0 0; font-size: 14px; opacity: 0.8;">Via ${data.refundMethod}</p>` : ''}
                  </div>
                  
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <p style="margin: 0 0 10px;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                    <p style="margin: 0 0 10px;"><strong>Refund Reason:</strong> ${data.refundReason || 'Customer request'}</p>
                    <p style="margin: 0;"><strong>Expected Credit:</strong> ${data.creditTime || '5-7 business days'}</p>
                  </div>
                  
                  <p style="color: #666; font-size: 14px;">
                    The refund will be credited to your original payment method. Bank processing times may vary.
                  </p>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${ordersUrl}" class="btn">View My Orders</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Questions about your refund? <a href="${contactUrl}" style="color: #1a1a2e;">Contact us</a></p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "review_request":
      return {
        subject: `How was your order from Odhra? ⭐`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .rating-section { text-align: center; padding: 30px; background: #f8f9fa; border-radius: 12px; margin: 20px 0; }
                .stars { font-size: 40px; letter-spacing: 8px; }
                .review-incentive { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 15px 20px; border-radius: 8px; margin-top: 15px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Share Your Experience! ⭐</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>We hope you're loving your recent purchase! Your feedback helps other shoppers and our vendors.</p>
                  
                  ${data.products && data.products.length > 0 ? `
                    <div style="margin: 20px 0;">
                      ${data.products.map((product: any) => {
                        // Build proper review URL for each product
                        const productReviewUrl = product.reviewUrl || (product.id ? buildUrl.productReview(product.id, data.orderId) : reviewUrl);
                        return `
                        <div style="display: flex; gap: 16px; padding: 16px; background: #f8f9fa; border-radius: 12px; margin-bottom: 12px;">
                          ${product.image ? `<img src="${product.image}" alt="${product.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">` : ''}
                          <div style="flex: 1;">
                            <p style="margin: 0 0 8px; font-weight: 600;">${product.title}</p>
                            <a href="${productReviewUrl}" style="color: #f59e0b; font-weight: 600; text-decoration: none;">Write a Review →</a>
                          </div>
                        </div>
                      `}).join('')}
                    </div>
                  ` : ''}
                  
                  <div class="rating-section">
                    <p style="margin: 0 0 15px; font-weight: 600;">Rate your experience</p>
                    <div class="stars">⭐⭐⭐⭐⭐</div>
                    ${data.reviewIncentive ? `
                      <div class="review-incentive">
                        <strong>🎁 ${data.reviewIncentive}</strong>
                      </div>
                    ` : ''}
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${reviewUrl}" class="btn btn-accent">Write a Review</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Thank you for shopping with Odhra!</p>
                  <p><a href="${unsubscribeUrl}" style="color: #666;">Manage email preferences</a></p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "loyalty_reward":
      return {
        subject: `🎉 You've Earned ${data.pointsEarned || 0} Loyalty Points!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .points-hero { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 50px 40px; text-align: center; color: white; }
                .points-display { font-size: 60px; font-weight: bold; margin: 20px 0; }
                .tier-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 20px; margin-top: 10px; }
                .rewards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0; }
                .reward-item { background: #f8f9fa; padding: 16px; border-radius: 12px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="points-hero">
                  <p style="margin: 0; font-size: 16px;">Congratulations! 🎊</p>
                  <div class="points-display">+${data.pointsEarned?.toLocaleString() || 0}</div>
                  <p style="margin: 0; font-size: 18px;">Points Earned</p>
                  ${data.tier ? `<div class="tier-badge">👑 ${data.tier} Member</div>` : ''}
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Your Loyalty Rewards</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>Thank you for your purchase! You've earned loyalty points that you can use on future orders.</p>
                  
                  <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                    <p style="margin: 0 0 10px; color: #666;">Your Total Points Balance</p>
                    <p style="font-size: 36px; font-weight: bold; color: #9b59b6; margin: 0;">${data.totalPoints?.toLocaleString() || 0}</p>
                    <p style="margin: 10px 0 0; font-size: 14px; color: #666;">Worth ₹${data.pointsValue?.toLocaleString('en-IN') || 0}</p>
                  </div>
                  
                  ${data.nextTier ? `
                    <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                      <strong>🚀 ${data.pointsToNextTier} points to ${data.nextTier}!</strong>
                      <p style="margin: 5px 0 0; color: #666; font-size: 14px;">Unlock exclusive benefits with your next tier.</p>
                    </div>
                  ` : ''}
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.rewardsUrl || shopUrl}" class="btn" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);">View My Rewards</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Keep shopping to earn more points!</p>
                  <p><a href="${unsubscribeUrl}" style="color: #666;">Manage email preferences</a></p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "newsletter":
      return {
        subject: data.subject || `✨ What's New at Odhra`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .article { margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #eee; }
                .article:last-child { border-bottom: none; }
                .article img { width: 100%; height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 15px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">${data.title || 'This Week at Odhra'}</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>${data.intro || 'Here\'s what\'s new and exciting at Odhra!'}</p>
                  
                  ${data.articles && data.articles.length > 0 ? `
                    <div style="margin: 30px 0;">
                      ${data.articles.map((article: any) => `
                        <div class="article">
                          ${article.image ? `<img src="${article.image}" alt="${article.title}">` : ''}
                          <h3 style="margin: 0 0 10px;">${article.title}</h3>
                          <p style="color: #666; margin: 0 0 15px;">${article.excerpt}</p>
                          <a href="${article.url || '#'}" style="color: #f59e0b; font-weight: 600; text-decoration: none;">Read More →</a>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  
                  ${data.featuredProducts && data.featuredProducts.length > 0 ? `
                    <h3>Featured This Week</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0;">
                      ${data.featuredProducts.slice(0, 4).map((product: any) => `
                        <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; text-align: center;">
                          ${product.image ? `<img src="${product.image}" alt="${product.title}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : ''}
                          <p style="margin: 0 0 5px; font-weight: 600; font-size: 14px;">${product.title}</p>
                          <p style="margin: 0; color: #1a1a2e; font-weight: bold;">₹${product.price?.toLocaleString('en-IN')}</p>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${shopUrl}" class="btn">Explore More</a>
                  </div>
                </div>
                <div class="footer">
                  <p style="font-size: 12px; color: #999;">You received this email because you're subscribed to the Odhra newsletter.</p>
                  <p><a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> | <a href="${preferencesUrl}" style="color: #666;">Email Preferences</a></p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "spin_wheel_unlocked":
      return {
        subject: `🎡 You've Unlocked a Spin! Try Your Luck Now!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .spin-hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center; color: white; }
                .spin-hero .wheel { font-size: 80px; margin: 20px 0; animation: spin 3s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .prizes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 25px 0; }
                .prize-item { background: #f8f9fa; padding: 15px; border-radius: 10px; text-align: center; }
                .prize-item span { font-size: 24px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="spin-hero">
                  <p style="margin: 0; font-size: 16px; opacity: 0.9;">Congratulations! 🎊</p>
                  <div class="wheel">🎡</div>
                  <h1 style="margin: 0; font-size: 28px;">You've Unlocked a Spin!</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Spin the Wheel & Win!</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>${data.reason === 'first_spin' 
                    ? 'Welcome to Odhra! As a new member, you get a FREE spin on our prize wheel!'
                    : `Thanks for your order of ₹${data.orderAmount?.toLocaleString('en-IN') || '999+'}! You've earned a spin on our prize wheel!`
                  }</p>
                  
                  <div class="prizes">
                    <div class="prize-item"><span>🎫</span><p style="margin: 5px 0 0; font-weight: 600;">10% Off</p></div>
                    <div class="prize-item"><span>💎</span><p style="margin: 5px 0 0; font-weight: 600;">20% Off</p></div>
                    <div class="prize-item"><span>🚚</span><p style="margin: 5px 0 0; font-weight: 600;">Free Shipping</p></div>
                    <div class="prize-item"><span>🌟</span><p style="margin: 5px 0 0; font-weight: 600;">₹100 Off</p></div>
                  </div>
                  
                  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0;">
                    <p style="margin: 0 0 5px; font-size: 14px;">Your spin expires in</p>
                    <p style="margin: 0; font-size: 28px; font-weight: bold;">48 Hours</p>
                    <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.8;">Don't miss out!</p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${spinUrl}" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-size: 18px; padding: 16px 32px;">Spin Now! 🎡</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Good luck! 🍀</p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "password_reset":
      return {
        subject: `Reset Your Odhra Password`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .reset-box { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Reset Your Password 🔐</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>We received a request to reset your password. Click the button below to set a new password:</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${passwordResetUrl}" class="btn btn-accent" style="font-size: 16px; padding: 16px 32px;">Reset Password</a>
                  </div>
                  
                  <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                    <strong>⏰ This link expires in 1 hour</strong>
                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email.</p>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${passwordResetUrl}" style="color: #3498db; word-break: break-all;">${passwordResetUrl}</a>
                  </p>
                </div>
                <div class="footer">
                  <p>Need help? <a href="${contactUrl}" style="color: #1a1a2e;">Contact us</a></p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "vendor_new_order":
      return {
        subject: `🎉 New Order Received - ${data.subOrderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .order-box { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA Vendor</h1>
                </div>
                <div class="content">
                  <h2 style="color: #27ae60; margin-top: 0;">New Order Received! 🎉</h2>
                  <p>Hi ${data.vendorName || 'there'},</p>
                  <p>Great news! You have received a new order.</p>
                  
                  <div class="order-box">
                    <p style="margin: 0 0 10px; opacity: 0.9;">Order Number</p>
                    <p style="font-size: 24px; font-weight: bold; margin: 0;">${data.subOrderNumber}</p>
                    <p style="margin: 10px 0 0; font-size: 18px;">₹${data.total?.toLocaleString('en-IN') || '0'}</p>
                  </div>
                  
                  ${data.items ? `
                    <div style="margin: 20px 0;">
                      <h3>Order Items:</h3>
                      ${data.items.map((item: any) => `
                        <div style="display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                          <div style="flex: 1;">
                            <p style="margin: 0 0 4px; font-weight: 600;">${item.title}</p>
                            <p style="margin: 0; color: #666; font-size: 14px;">Qty: ${item.quantity} × ₹${item.price?.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.subOrderId ? buildUrl.vendorOrder(data.subOrderId) : buildUrl.vendorDashboard()}" class="btn btn-accent">View Order Details</a>
                  </div>
                  
                  <p style="margin-top: 20px; color: #e74c3c; font-size: 14px; text-align: center;">
                    ⚠️ Please process this order within 24 hours
                  </p>
                </div>
                <div class="footer">
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "ticket_reply":
      return {
        subject: `Reply to Your Support Ticket - ${data.ticketNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .ticket-box { background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #3498db; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA Support</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">New Reply on Your Ticket 💬</h2>
                  <p>Hi ${data.customerName || 'there'},</p>
                  <p>Our support team has replied to your ticket.</p>
                  
                  <div class="ticket-box">
                    <p style="margin: 0 0 10px;"><strong>Ticket:</strong> ${data.ticketNumber}</p>
                    <p style="margin: 0 0 10px;"><strong>Subject:</strong> ${data.subject}</p>
                    ${data.replyPreview ? `<p style="margin: 0; color: #666; font-style: italic;">"${data.replyPreview}..."</p>` : ''}
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.ticketId ? `${BASE_URL}/account/support/${data.ticketId}` : supportUrl}" class="btn">View Full Reply</a>
                  </div>
                </div>
                <div class="footer">
                  <p>Need more help? Reply to this ticket or <a href="${contactUrl}" style="color: #1a1a2e;">contact us</a></p>
                  <p>© 2025 Odhra Marketplace. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "admin_new_order":
      return {
        subject: `📦 New Order Received - ${data.orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .order-summary { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 25px; border-radius: 12px; margin: 25px 0; }
                .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; }
                .stat-item { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA Admin</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">New Order Alert 📦</h2>
                  <p>A new order has been placed on the platform.</p>
                  
                  <div class="order-summary">
                    <div style="text-align: center;">
                      <p style="margin: 0 0 5px; opacity: 0.8; font-size: 14px;">Order Number</p>
                      <p style="font-size: 24px; font-weight: bold; margin: 0;">${data.orderNumber}</p>
                    </div>
                    <div class="stat-grid">
                      <div class="stat-item">
                        <p style="margin: 0; opacity: 0.8; font-size: 12px;">Total</p>
                        <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold;">₹${data.total?.toLocaleString('en-IN') || '0'}</p>
                      </div>
                      <div class="stat-item">
                        <p style="margin: 0; opacity: 0.8; font-size: 12px;">Items</p>
                        <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold;">${data.itemCount || 0}</p>
                      </div>
                      <div class="stat-item">
                        <p style="margin: 0; opacity: 0.8; font-size: 12px;">Vendors</p>
                        <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold;">${data.vendorCount || 1}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <p style="margin: 0 0 10px;"><strong>Customer:</strong> ${data.customerName || 'N/A'}</p>
                    <p style="margin: 0 0 10px;"><strong>Email:</strong> ${data.customerEmail || 'N/A'}</p>
                    <p style="margin: 0;"><strong>Payment:</strong> ${data.paymentMethod || 'Razorpay'}</p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${data.orderId ? buildUrl.adminOrder(data.orderId) : BASE_URL + '/admin?tab=orders'}" class="btn">View Order Details</a>
                  </div>
                </div>
                <div class="footer">
                  <p>© 2025 Odhra Marketplace. Admin Notification.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "vendor_order_update":
      return {
        subject: `Order Status Update - ${data.subOrderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
                .status-confirmed { background: #d4edda; color: #155724; }
                .status-shipped { background: #cce5ff; color: #004085; }
                .status-delivered { background: #c3e6cb; color: #155724; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA Vendor</h1>
                </div>
                <div class="content">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Order Status Updated</h2>
                  <p>Hi ${data.vendorName || 'there'},</p>
                  <p>The status of your order has been updated.</p>
                  
                  <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px;">Order: <strong>${data.subOrderNumber}</strong></p>
                    <span class="status-badge status-${data.status?.toLowerCase() || 'confirmed'}">${data.status || 'Updated'}</span>
                  </div>
                  
                  ${data.message ? `<p style="color: #666;">${data.message}</p>` : ''}
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${buildUrl.vendorDashboard()}" class="btn">Go to Dashboard</a>
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

    case "admin_low_stock":
      return {
        subject: `⚠️ Low Stock Alert - ${data.productName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}
                .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 0 12px 12px 0; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✨ ODHRA Admin</h1>
                </div>
                <div class="content">
                  <h2 style="color: #dc3545; margin-top: 0;">⚠️ Low Stock Alert</h2>
                  <p>A product is running low on stock and needs attention.</p>
                  
                  <div class="alert-box">
                    <p style="margin: 0 0 10px;"><strong>Product:</strong> ${data.productName}</p>
                    <p style="margin: 0 0 10px;"><strong>Current Stock:</strong> <span style="color: #dc3545; font-weight: bold;">${data.currentStock} units</span></p>
                    <p style="margin: 0 0 10px;"><strong>Reorder Point:</strong> ${data.reorderPoint || 10} units</p>
                    <p style="margin: 0;"><strong>Vendor:</strong> ${data.vendorName || 'N/A'}</p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${BASE_URL}/admin?tab=products" class="btn btn-accent">Manage Inventory</a>
                  </div>
                </div>
                <div class="footer">
                  <p>© 2025 Odhra Marketplace. Admin Notification.</p>
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

    // Input validation
    if (!type || !to) {
      throw new Error("Email type and recipient are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Invalid email address format");
    }

    // Sanitize data to prevent XSS in email templates
    const sanitizeString = (str: string): string => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };

    // Only sanitize string values, preserve numbers and URLs
    const sanitizedData = { ...data };
    for (const key in sanitizedData) {
      if (typeof sanitizedData[key] === 'string' && !key.toLowerCase().includes('url') && !key.toLowerCase().includes('html')) {
        sanitizedData[key] = sanitizeString(sanitizedData[key]);
      }
    }

    console.log("Sending email:", { type, to });

    const template = getEmailTemplate(type, sanitizedData);

    const emailResponse = await resend.emails.send({
      from: "Odhra <onboarding@resend.dev>",
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
