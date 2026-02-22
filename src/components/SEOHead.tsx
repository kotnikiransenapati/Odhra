import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, any>;
}

const SITE_NAME = 'Odhra';
const DEFAULT_DESCRIPTION = 'India\'s premium multi-vendor marketplace. Discover curated collections from 500+ verified vendors. Quality products, secure payments, fast delivery.';
const DEFAULT_OG_IMAGE = 'https://lovable.dev/opengraph-image-p98pqg.png';
const SITE_URL = 'https://odhra1.lovable.app';

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  canonical,
  noIndex = false,
  jsonLd,
}: SEOHeadProps) {
  const location = useLocation();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Luxury Marketplace`;
  const canonicalUrl = canonical || `${SITE_URL}${location.pathname}`;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Helper to set/create meta tags
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard meta
    setMeta('name', 'description', description);
    if (keywords) setMeta('name', 'keywords', keywords);
    if (noIndex) setMeta('name', 'robots', 'noindex, nofollow');

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:site_name', SITE_NAME);

    // Twitter
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);

    // Canonical link
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // JSON-LD structured data
    const existingLd = document.getElementById('seo-jsonld');
    if (existingLd) existingLd.remove();

    const ldData = jsonLd || {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/shop?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    const script = document.createElement('script');
    script.id = 'seo-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ldData);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('seo-jsonld');
      if (el) el.remove();
    };
  }, [fullTitle, description, keywords, ogImage, ogType, canonicalUrl, noIndex, jsonLd]);

  return null;
}

// Product JSON-LD helper
export function productJsonLd(product: {
  title: string;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  slug: string;
  avg_rating?: number | null;
  review_count?: number | null;
  stock: number;
  product_images?: { url: string; alt_text?: string | null }[];
  vendors_public?: { brand_name: string } | null;
}) {
  const image = product.product_images?.[0]?.url;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.title,
    image: image || undefined,
    url: `https://odhra1.lovable.app/product/${product.slug}`,
    brand: product.vendors_public ? {
      '@type': 'Brand',
      name: product.vendors_public.brand_name,
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      ...(product.compare_at_price ? { 
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
      } : {}),
    },
    ...(product.review_count && product.avg_rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.avg_rating,
        reviewCount: product.review_count,
      },
    } : {}),
  };
}

// Breadcrumb JSON-LD helper
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Organization JSON-LD
export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Odhra',
  url: 'https://odhra1.lovable.app',
  logo: 'https://odhra1.lovable.app/pwa-512x512.png',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-1800-123-4567',
    contactType: 'customer service',
    availableLanguage: ['English', 'Hindi'],
  },
  sameAs: [],
};
