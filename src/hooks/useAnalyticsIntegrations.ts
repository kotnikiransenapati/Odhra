import { useEffect, useCallback, useRef } from 'react';
import { useIntegration } from './useIntegrationSettings';
import { useCookieConsent } from './useCookieConsent';

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
    anonymize_ip: true,
  });
}

export function useGA4() {
  const { isEnabled, config } = useIntegration('google_analytics');
  const { preferences } = useCookieConsent();
  const initialized = useRef(false);

  // Only load when analytics consent is granted
  const canLoad = isEnabled && config.measurement_id && preferences?.analytics !== false;

  useEffect(() => {
    if (canLoad && !initialized.current) {
      loadGA4Script(config.measurement_id);
      initialized.current = true;
    }
  }, [canLoad, config.measurement_id]);

  const trackEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      if (canLoad && window.gtag) {
        window.gtag('event', eventName, params);
      }
    },
    [canLoad]
  );

  const trackPageView = useCallback(
    (path: string, title?: string) => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'page_view', { page_path: path, page_title: title });
      }
    },
    [canLoad]
  );

  const trackPurchase = useCallback(
    (transactionId: string, value: number, items: any[], currency = 'INR') => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'purchase', {
          transaction_id: transactionId,
          value,
          currency,
          items: items.map(i => ({
            item_id: i.item_id || i.id,
            item_name: i.item_name || i.name,
            price: i.price,
            quantity: i.quantity || 1,
            item_category: i.category,
            item_brand: i.brand,
          })),
        });
      }
    },
    [canLoad]
  );

  const trackAddToCart = useCallback(
    (item: { id: string; name: string; price: number; quantity: number; category?: string }, currency = 'INR') => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'add_to_cart', {
          currency,
          value: item.price * item.quantity,
          items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity, item_category: item.category }],
        });
      }
    },
    [canLoad]
  );

  const trackRemoveFromCart = useCallback(
    (item: { id: string; name: string; price: number; quantity: number }, currency = 'INR') => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'remove_from_cart', {
          currency,
          value: item.price * item.quantity,
          items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity }],
        });
      }
    },
    [canLoad]
  );

  const trackBeginCheckout = useCallback(
    (value: number, items: any[], currency = 'INR', coupon?: string) => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'begin_checkout', { currency, value, items, coupon });
      }
    },
    [canLoad]
  );

  const trackAddShippingInfo = useCallback(
    (value: number, shippingTier: string, currency = 'INR') => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'add_shipping_info', { currency, value, shipping_tier: shippingTier });
      }
    },
    [canLoad]
  );

  const trackAddPaymentInfo = useCallback(
    (value: number, paymentType: string, currency = 'INR') => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'add_payment_info', { currency, value, payment_type: paymentType });
      }
    },
    [canLoad]
  );

  const trackViewItemList = useCallback(
    (listId: string, listName: string, items: any[]) => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'view_item_list', {
          item_list_id: listId,
          item_list_name: listName,
          items: items.slice(0, 10).map((i, idx) => ({
            item_id: i.id, item_name: i.name, price: i.price, index: idx,
          })),
        });
      }
    },
    [canLoad]
  );

  const trackSelectItem = useCallback(
    (listId: string, item: { id: string; name: string; price: number }) => {
      if (canLoad && window.gtag) {
        window.gtag('event', 'select_item', {
          item_list_id: listId,
          items: [{ item_id: item.id, item_name: item.name, price: item.price }],
        });
      }
    },
    [canLoad]
  );

  return {
    trackEvent, trackPageView, trackPurchase, trackAddToCart, trackRemoveFromCart,
    trackBeginCheckout, trackAddShippingInfo, trackAddPaymentInfo,
    trackViewItemList, trackSelectItem, isEnabled: !!canLoad,
  };
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
  const { preferences } = useCookieConsent();
  const initialized = useRef(false);

  const canLoad = isEnabled && config.pixel_id && preferences?.marketing !== false;

  useEffect(() => {
    if (canLoad && !initialized.current) {
      loadFBPixelScript(config.pixel_id);
      initialized.current = true;
    }
  }, [canLoad, config.pixel_id]);

  const trackEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      if (canLoad && window.fbq) window.fbq('track', eventName, params);
    },
    [canLoad]
  );

  const trackCustomEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      if (canLoad && window.fbq) window.fbq('trackCustom', eventName, params);
    },
    [canLoad]
  );

  const trackPurchase = useCallback(
    (value: number, currency = 'INR', contentIds: string[] = [], numItems?: number) => {
      if (canLoad && window.fbq) {
        window.fbq('track', 'Purchase', {
          value, currency, content_ids: contentIds, content_type: 'product', num_items: numItems || contentIds.length,
        });
      }
    },
    [canLoad]
  );

  const trackAddToCart = useCallback(
    (value: number, currency = 'INR', contentId?: string, contentName?: string) => {
      if (canLoad && window.fbq) {
        window.fbq('track', 'AddToCart', {
          value, currency,
          content_ids: contentId ? [contentId] : [],
          content_name: contentName,
          content_type: 'product',
        });
      }
    },
    [canLoad]
  );

  const trackInitiateCheckout = useCallback(
    (value: number, numItems: number, currency = 'INR', contentIds: string[] = []) => {
      if (canLoad && window.fbq) {
        window.fbq('track', 'InitiateCheckout', { value, currency, num_items: numItems, content_ids: contentIds });
      }
    },
    [canLoad]
  );

  const trackViewContent = useCallback(
    (contentId: string, contentName: string, value: number, currency = 'INR', category?: string) => {
      if (canLoad && window.fbq) {
        window.fbq('track', 'ViewContent', {
          content_ids: [contentId], content_name: contentName, content_category: category,
          value, currency, content_type: 'product',
        });
      }
    },
    [canLoad]
  );

  const trackSearch = useCallback(
    (query: string) => {
      if (canLoad && window.fbq) window.fbq('track', 'Search', { search_string: query });
    },
    [canLoad]
  );

  const trackAddToWishlist = useCallback(
    (contentId: string, contentName: string, value: number, currency = 'INR') => {
      if (canLoad && window.fbq) {
        window.fbq('track', 'AddToWishlist', {
          content_ids: [contentId], content_name: contentName, value, currency, content_type: 'product',
        });
      }
    },
    [canLoad]
  );

  const trackLead = useCallback(
    (value?: number, currency = 'INR') => {
      if (canLoad && window.fbq) window.fbq('track', 'Lead', { value, currency });
    },
    [canLoad]
  );

  const trackCompleteRegistration = useCallback(
    (method?: string) => {
      if (canLoad && window.fbq) window.fbq('track', 'CompleteRegistration', { status: true, content_name: method });
    },
    [canLoad]
  );

  return {
    trackEvent, trackCustomEvent, trackPurchase, trackAddToCart, trackInitiateCheckout,
    trackViewContent, trackSearch, trackAddToWishlist, trackLead, trackCompleteRegistration,
    isEnabled: !!canLoad,
  };
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
    },
    [ga4]
  );

  const trackPurchase = useCallback(
    (transactionId: string, value: number, items: any[], currency = 'INR') => {
      ga4.trackPurchase(transactionId, value, items, currency);
      fbPixel.trackPurchase(value, currency, items.map((i: any) => i.item_id || i.id), items.length);
    },
    [ga4, fbPixel]
  );

  const trackAddToCart = useCallback(
    (item: { id: string; name: string; price: number; quantity: number; category?: string }) => {
      ga4.trackAddToCart(item);
      fbPixel.trackAddToCart(item.price * item.quantity, 'INR', item.id, item.name);
    },
    [ga4, fbPixel]
  );

  const trackBeginCheckout = useCallback(
    (value: number, items: any[], currency = 'INR') => {
      ga4.trackBeginCheckout(value, items, currency);
      fbPixel.trackInitiateCheckout(value, items.length, currency, items.map((i: any) => i.id));
    },
    [ga4, fbPixel]
  );

  const trackViewProduct = useCallback(
    (id: string, name: string, price: number, currency = 'INR', category?: string) => {
      ga4.trackEvent('view_item', { items: [{ item_id: id, item_name: name, price, item_category: category }], currency, value: price });
      fbPixel.trackViewContent(id, name, price, currency, category);
    },
    [ga4, fbPixel]
  );

  const trackSearch = useCallback(
    (query: string) => {
      ga4.trackEvent('search', { search_term: query });
      fbPixel.trackSearch(query);
    },
    [ga4, fbPixel]
  );

  const trackSignUp = useCallback(
    (method: string) => {
      ga4.trackEvent('sign_up', { method });
      fbPixel.trackCompleteRegistration(method);
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

  const trackAddToWishlist = useCallback(
    (id: string, name: string, price: number, currency = 'INR') => {
      ga4.trackEvent('add_to_wishlist', { items: [{ item_id: id, item_name: name, price }], currency, value: price });
      fbPixel.trackAddToWishlist(id, name, price, currency);
    },
    [ga4, fbPixel]
  );

  return {
    trackPageView, trackPurchase, trackAddToCart, trackBeginCheckout,
    trackViewProduct, trackSearch, trackSignUp, trackLogin, trackAddToWishlist,
    ga4, fbPixel,
  };
}
