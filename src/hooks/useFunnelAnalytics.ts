import { useCallback } from 'react';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';

/**
 * Funnel analytics hook — tracks key conversion steps:
 * page_view → product_view → add_to_cart → begin_checkout → purchase
 * 
 * Also tracks micro-conversions: wishlist, search, promo usage
 */
export function useFunnelAnalytics() {
  const { track, trackPageView, trackProductView, trackAddToCart, trackPurchase, trackSearch } = useAnalyticsTracker();

  const trackBeginCheckout = useCallback((value: number, itemCount: number) => {
    track('begin_checkout', { value, items_count: itemCount });
  }, [track]);

  const trackWishlistAdd = useCallback((productId: string, productName: string) => {
    track('wishlist_add', { product_id: productId, product_name: productName });
  }, [track]);

  const trackWishlistRemove = useCallback((productId: string) => {
    track('wishlist_remove', { product_id: productId });
  }, [track]);

  const trackPromoApplied = useCallback((code: string, discount: number) => {
    track('promo_code_applied', { code, discount_amount: discount });
  }, [track]);

  const trackScrollDepth = useCallback((depth: number, pageName: string) => {
    track('scroll_depth', { depth_percent: depth, page_name: pageName });
  }, [track]);

  const trackExitIntent = useCallback((pageName: string) => {
    track('exit_intent', { page_name: pageName });
  }, [track]);

  const trackClick = useCallback((element: string, context?: string) => {
    track('click', { element, context });
  }, [track]);

  const trackImpression = useCallback((productId: string, position: number, listName: string) => {
    track('impression', { product_id: productId, position, list_name: listName });
  }, [track]);

  return {
    trackPageView,
    trackProductView,
    trackAddToCart,
    trackPurchase,
    trackSearch,
    trackBeginCheckout,
    trackWishlistAdd,
    trackWishlistRemove,
    trackPromoApplied,
    trackScrollDepth,
    trackExitIntent,
    trackClick,
    trackImpression,
  };
}

/**
 * Hook to track scroll depth on a page (25%, 50%, 75%, 100%)
 */
export function useScrollDepthTracker(pageName: string) {
  const { trackScrollDepth } = useFunnelAnalytics();

  const milestones = new Set<number>();

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    const percent = Math.round((scrollTop / docHeight) * 100);

    [25, 50, 75, 100].forEach(milestone => {
      if (percent >= milestone && !milestones.has(milestone)) {
        milestones.add(milestone);
        trackScrollDepth(milestone, pageName);
      }
    });
  }, [pageName, trackScrollDepth]);

  return handleScroll;
}
