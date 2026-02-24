import { useEffect, useCallback, useRef } from 'react';
import { useIntegration } from './useIntegrationSettings';

// ============================
// Google Analytics 4
// ============================

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

function loadGA4Script(measurementId: string) {
  if (document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure',
  });
}

export function useGA4() {
  const { isEnabled, config } = useIntegration('google_analytics');
  const initialized = useRef(false);

  useEffect(() => {
    if (isEnabled && config.measurement_id && !initialized.current) {
      loadGA4Script(config.measurement_id);
      initialized.current = true;
    }
  }, [isEnabled, config.measurement_id]);

  const trackEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      if (isEnabled && window.gtag) {
        window.gtag('event', eventName, params);
      }
    },
    [isEnabled]
  );

  const trackPageView = useCallback(
    (path: string, title?: string) => {
      if (isEnabled && window.gtag) {
        window.gtag('event', 'page_view', {
          page_path: path,
          page_title: title,
        });
      }
    },
    [isEnabled]
  );

  const trackPurchase = useCallback(
    (transactionId: string, value: number, items: any[], currency = 'INR') => {
      if (isEnabled && window.gtag) {
        window.gtag('event', 'purchase', {
          transaction_id: transactionId,
          value,
          currency,
          items,
        });
      }
    },
    [isEnabled]
  );

  const trackAddToCart = useCallback(
    (item: { id: string; name: string; price: number; quantity: number }, currency = 'INR') => {
      if (isEnabled && window.gtag) {
        window.gtag('event', 'add_to_cart', {
          currency,
          value: item.price * item.quantity,
          items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity }],
        });
      }
    },
    [isEnabled]
  );

  const trackBeginCheckout = useCallback(
    (value: number, items: any[], currency = 'INR') => {
      if (isEnabled && window.gtag) {
        window.gtag('event', 'begin_checkout', { currency, value, items });
      }
    },
    [isEnabled]
  );

  return { trackEvent, trackPageView, trackPurchase, trackAddToCart, trackBeginCheckout, isEnabled };
}

// ============================
// Facebook Pixel
// ============================

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

function loadFBPixelScript(pixelId: string) {
  if (window.fbq) return;

  const f = window;
  const b = document;
  const n: any = (f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];

  const s = b.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const fjs = b.getElementsByTagName('script')[0];
  fjs?.parentNode?.insertBefore(s, fjs);

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

export function useFBPixel() {
  const { isEnabled, config } = useIntegration('facebook_pixel');
  const initialized = useRef(false);

  useEffect(() => {
    if (isEnabled && config.pixel_id && !initialized.current) {
      loadFBPixelScript(config.pixel_id);
      initialized.current = true;
    }
  }, [isEnabled, config.pixel_id]);

  const trackEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      if (isEnabled && window.fbq) {
        window.fbq('track', eventName, params);
      }
    },
    [isEnabled]
  );

  const trackCustomEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      if (isEnabled && window.fbq) {
        window.fbq('trackCustom', eventName, params);
      }
    },
    [isEnabled]
  );

  const trackPurchase = useCallback(
    (value: number, currency = 'INR', contentIds: string[] = []) => {
      if (isEnabled && window.fbq) {
        window.fbq('track', 'Purchase', { value, currency, content_ids: contentIds, content_type: 'product' });
      }
    },
    [isEnabled]
  );

  const trackAddToCart = useCallback(
    (value: number, currency = 'INR', contentId?: string) => {
      if (isEnabled && window.fbq) {
        window.fbq('track', 'AddToCart', { value, currency, content_ids: contentId ? [contentId] : [], content_type: 'product' });
      }
    },
    [isEnabled]
  );

  const trackInitiateCheckout = useCallback(
    (value: number, numItems: number, currency = 'INR') => {
      if (isEnabled && window.fbq) {
        window.fbq('track', 'InitiateCheckout', { value, currency, num_items: numItems });
      }
    },
    [isEnabled]
  );

  const trackViewContent = useCallback(
    (contentId: string, contentName: string, value: number, currency = 'INR') => {
      if (isEnabled && window.fbq) {
        window.fbq('track', 'ViewContent', { content_ids: [contentId], content_name: contentName, value, currency, content_type: 'product' });
      }
    },
    [isEnabled]
  );

  return { trackEvent, trackCustomEvent, trackPurchase, trackAddToCart, trackInitiateCheckout, trackViewContent, isEnabled };
}

// ============================
// Unified Analytics Hook
// ============================

export function useUnifiedAnalytics() {
  const ga4 = useGA4();
  const fbPixel = useFBPixel();

  const trackPageView = useCallback(
    (path: string, title?: string) => {
      ga4.trackPageView(path, title);
      // FB Pixel auto-tracks page views on load
    },
    [ga4]
  );

  const trackPurchase = useCallback(
    (transactionId: string, value: number, items: any[], currency = 'INR') => {
      ga4.trackPurchase(transactionId, value, items, currency);
      fbPixel.trackPurchase(value, currency, items.map((i: any) => i.item_id || i.id));
    },
    [ga4, fbPixel]
  );

  const trackAddToCart = useCallback(
    (item: { id: string; name: string; price: number; quantity: number }) => {
      ga4.trackAddToCart(item);
      fbPixel.trackAddToCart(item.price * item.quantity, 'INR', item.id);
    },
    [ga4, fbPixel]
  );

  const trackBeginCheckout = useCallback(
    (value: number, items: any[], currency = 'INR') => {
      ga4.trackBeginCheckout(value, items, currency);
      fbPixel.trackInitiateCheckout(value, items.length, currency);
    },
    [ga4, fbPixel]
  );

  const trackViewProduct = useCallback(
    (id: string, name: string, price: number, currency = 'INR') => {
      ga4.trackEvent('view_item', { items: [{ item_id: id, item_name: name, price }], currency, value: price });
      fbPixel.trackViewContent(id, name, price, currency);
    },
    [ga4, fbPixel]
  );

  const trackSearch = useCallback(
    (query: string) => {
      ga4.trackEvent('search', { search_term: query });
      fbPixel.trackEvent('Search', { search_string: query });
    },
    [ga4, fbPixel]
  );

  const trackSignUp = useCallback(
    (method: string) => {
      ga4.trackEvent('sign_up', { method });
      fbPixel.trackEvent('CompleteRegistration', { status: true });
    },
    [ga4, fbPixel]
  );

  const trackLogin = useCallback(
    (method: string) => {
      ga4.trackEvent('login', { method });
      fbPixel.trackCustomEvent('Login', { method });
    },
    [ga4, fbPixel]
  );

  return {
    trackPageView,
    trackPurchase,
    trackAddToCart,
    trackBeginCheckout,
    trackViewProduct,
    trackSearch,
    trackSignUp,
    trackLogin,
    ga4,
    fbPixel,
  };
}
