/**
 * Universal Link Builder for Odhra eCommerce Platform
 * 
 * Generates properly formatted, trackable links for all sharing channels
 * including WhatsApp, Email, SMS, social media, and referral campaigns.
 */

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://odhra1.lovable.app';

// ─── UTM Parameters ──────────────────────────────────────────────
export interface UTMParams {
  source: string;    // e.g. 'whatsapp', 'email', 'instagram'
  medium: string;    // e.g. 'social', 'referral', 'campaign'
  campaign?: string; // e.g. 'summer_sale', 'product_share'
  term?: string;     // keyword (optional)
  content?: string;  // e.g. 'hero_banner', 'product_card'
}

function appendUTM(url: URL, utm?: UTMParams): URL {
  if (!utm) return url;
  url.searchParams.set('utm_source', utm.source);
  url.searchParams.set('utm_medium', utm.medium);
  if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign);
  if (utm.term) url.searchParams.set('utm_term', utm.term);
  if (utm.content) url.searchParams.set('utm_content', utm.content);
  return url;
}

// ─── Link Types ──────────────────────────────────────────────────

export type ShareChannel = 'whatsapp' | 'email' | 'sms' | 'twitter' | 'facebook' | 'telegram' | 'copy' | 'native';

export interface ShareableLink {
  url: string;
  title: string;
  description: string;
  /** Pre-formatted message for messaging channels */
  message: string;
}

// ─── Product Links ───────────────────────────────────────────────

export function buildProductLink(
  slug: string,
  options?: { ref?: string; utm?: UTMParams }
): string {
  const url = new URL(`/product/${encodeURIComponent(slug)}`, BASE_URL);
  if (options?.ref) url.searchParams.set('ref', options.ref);
  if (options?.utm) appendUTM(url, options.utm);
  return url.toString();
}

export function buildProductShareable(
  product: { title: string; slug: string; price: number; compareAtPrice?: number | null },
  options?: { ref?: string; channel?: ShareChannel }
): ShareableLink {
  const channel = options?.channel || 'copy';
  const utm: UTMParams = {
    source: channel,
    medium: options?.ref ? 'referral' : 'social',
    campaign: 'product_share',
  };

  const url = buildProductLink(product.slug, { ref: options?.ref, utm });
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const priceStr = formatINR(product.price);
  const title = product.title;
  const description = discount > 0
    ? `${title} - Now ${priceStr} (${discount}% OFF) on Odhra`
    : `${title} - ${priceStr} on Odhra`;

  const message = discount > 0
    ? `🛍️ *${title}*\n💰 ${priceStr} (${discount}% OFF!)\n\n🔗 ${url}\n\nShop now on Odhra — India's premium marketplace!`
    : `🛍️ *${title}*\n💰 ${priceStr}\n\n🔗 ${url}\n\nShop now on Odhra — India's premium marketplace!`;

  return { url, title, description, message };
}

// ─── Collection / Category Links ─────────────────────────────────

export function buildCollectionLink(
  categorySlug: string,
  options?: { utm?: UTMParams }
): string {
  const url = new URL('/shop', BASE_URL);
  url.searchParams.set('category', categorySlug);
  if (options?.utm) appendUTM(url, options.utm);
  return url.toString();
}

export function buildCollectionShareable(
  category: { name: string; slug: string; description?: string | null },
  options?: { channel?: ShareChannel }
): ShareableLink {
  const channel = options?.channel || 'copy';
  const utm: UTMParams = {
    source: channel,
    medium: 'social',
    campaign: 'collection_share',
  };

  const url = buildCollectionLink(category.slug, { utm });
  const title = `${category.name} Collection`;
  const description = category.description || `Explore the ${category.name} collection on Odhra`;
  const message = `✨ *${title}*\n${description}\n\n🔗 ${url}\n\nDiscover more on Odhra!`;

  return { url, title, description, message };
}

// ─── Vendor / Store Links ────────────────────────────────────────

export function buildVendorLink(
  vendorSlug: string,
  options?: { utm?: UTMParams }
): string {
  const url = new URL(`/store/${encodeURIComponent(vendorSlug)}`, BASE_URL);
  if (options?.utm) appendUTM(url, options.utm);
  return url.toString();
}

export function buildVendorShareable(
  vendor: { brandName: string; slug: string; bio?: string | null },
  options?: { channel?: ShareChannel }
): ShareableLink {
  const channel = options?.channel || 'copy';
  const utm: UTMParams = {
    source: channel,
    medium: 'social',
    campaign: 'store_share',
  };

  const url = buildVendorLink(vendor.slug, { utm });
  const title = `${vendor.brandName} on Odhra`;
  const description = vendor.bio || `Shop from ${vendor.brandName} on Odhra`;
  const message = `🏪 *${vendor.brandName}*\n${description}\n\n🔗 ${url}\n\nShop now on Odhra!`;

  return { url, title, description, message };
}

// ─── Referral Links ──────────────────────────────────────────────

export function buildReferralLink(
  code: string,
  options?: { channel?: ShareChannel }
): string {
  const channel = options?.channel || 'copy';
  const url = new URL('/auth', BASE_URL);
  url.searchParams.set('ref', code);
  appendUTM(url, {
    source: channel,
    medium: 'referral',
    campaign: 'referral_invite',
  });
  return url.toString();
}

export function buildReferralShareable(
  code: string,
  options?: { channel?: ShareChannel; reward?: number }
): ShareableLink {
  const channel = options?.channel || 'copy';
  const url = buildReferralLink(code, { channel });
  const reward = options?.reward || 50;
  const title = 'Join Odhra & Get Rewards!';
  const description = `Use code ${code} and get ${reward} bonus points on signup!`;
  const message = `🎁 *Join Odhra & Earn ₹${reward} Bonus!*\n\nUse my referral code *${code}* and get rewarded instantly!\n\n🔗 ${url}\n\nIndia's premium marketplace — 500+ verified vendors, secure payments, fast delivery.`;

  return { url, title, description, message };
}

// ─── Flash Sale Links ────────────────────────────────────────────

export function buildFlashSaleLink(options?: { utm?: UTMParams }): string {
  const url = new URL('/flash-sales', BASE_URL);
  if (options?.utm) appendUTM(url, options.utm);
  return url.toString();
}

export function buildFlashSaleShareable(
  sale?: { title?: string },
  options?: { channel?: ShareChannel }
): ShareableLink {
  const channel = options?.channel || 'copy';
  const utm: UTMParams = {
    source: channel,
    medium: 'social',
    campaign: 'flash_sale',
  };
  const url = buildFlashSaleLink({ utm });
  const title = sale?.title || '⚡ Flash Sale Live on Odhra!';
  const description = 'Massive discounts for limited time only!';
  const message = `⚡ *${title}*\n🔥 Massive discounts for limited time only!\n\n🔗 ${url}\n\nHurry, before stocks run out!`;

  return { url, title, description, message };
}

// ─── Generic Page Links ──────────────────────────────────────────

export function buildPageLink(
  path: string,
  options?: { utm?: UTMParams; params?: Record<string, string> }
): string {
  const url = new URL(path, BASE_URL);
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  if (options?.utm) appendUTM(url, options.utm);
  return url.toString();
}

// ─── Channel Executors ───────────────────────────────────────────

export function executeShare(channel: ShareChannel, shareable: ShareableLink): void {
  switch (channel) {
    case 'whatsapp':
      window.open(
        `https://wa.me/?text=${encodeURIComponent(shareable.message)}`,
        '_blank',
        'noopener,noreferrer'
      );
      break;

    case 'telegram':
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(shareable.url)}&text=${encodeURIComponent(shareable.message)}`,
        '_blank',
        'noopener,noreferrer'
      );
      break;

    case 'twitter':
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareable.description)}&url=${encodeURIComponent(shareable.url)}`,
        '_blank',
        'noopener,noreferrer'
      );
      break;

    case 'facebook':
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareable.url)}`,
        '_blank',
        'noopener,noreferrer'
      );
      break;

    case 'email': {
      const subject = encodeURIComponent(shareable.title);
      const body = encodeURIComponent(`${shareable.description}\n\n${shareable.url}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      break;
    }

    case 'sms': {
      const smsBody = encodeURIComponent(`${shareable.description} ${shareable.url}`);
      window.location.href = `sms:?body=${smsBody}`;
      break;
    }

    case 'copy':
      navigator.clipboard.writeText(shareable.url).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = shareable.url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
      break;

    case 'native':
      if (navigator.share) {
        navigator.share({
          title: shareable.title,
          text: shareable.description,
          url: shareable.url,
        }).catch(() => {
          // User cancelled or not supported — silent
        });
      } else {
        // Fallback to copy
        executeShare('copy', shareable);
      }
      break;
  }
}

// ─── WhatsApp Message Builder (for admin/campaigns) ──────────────

export interface WhatsAppMessageConfig {
  phone?: string;
  productTitle?: string;
  productSlug?: string;
  orderNumber?: string;
  trackingUrl?: string;
  customMessage?: string;
}

export function buildWhatsAppDirectLink(config: WhatsAppMessageConfig): string {
  let text = config.customMessage || '';

  if (config.productTitle && config.productSlug) {
    const productUrl = buildProductLink(config.productSlug, {
      utm: { source: 'whatsapp', medium: 'direct', campaign: 'product_inquiry' },
    });
    text = text || `Hi! I'm interested in *${config.productTitle}*.\n\n🔗 ${productUrl}`;
  }

  if (config.orderNumber) {
    text = text || `Hi! I have a question about my order *${config.orderNumber}*.`;
  }

  if (config.trackingUrl) {
    text += `\n\n📦 Track: ${config.trackingUrl}`;
  }

  const base = config.phone
    ? `https://wa.me/${config.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  return base;
}

// ─── Email Link Builder ──────────────────────────────────────────

export function buildEmailShareLink(options: {
  to?: string;
  subject: string;
  body: string;
}): string {
  const params = new URLSearchParams();
  if (options.to) params.set('to', options.to);
  params.set('subject', options.subject);
  params.set('body', options.body);
  return `mailto:${options.to || ''}?${params.toString()}`;
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Check if Web Share API is available */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/** Parse UTM params from current URL */
export function parseUTMFromURL(): UTMParams | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  if (!source || !medium) return null;
  return {
    source,
    medium,
    campaign: params.get('utm_campaign') || undefined,
    term: params.get('utm_term') || undefined,
    content: params.get('utm_content') || undefined,
  };
}

/** Parse referral code from current URL */
export function parseRefFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ref');
}
