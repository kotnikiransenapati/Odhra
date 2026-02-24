import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

// ─── Types ─────────────────────────────────────────────────────────
export type BehaviorEventType =
  | 'page_view'
  | 'product_view'
  | 'product_impression'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'purchase'
  | 'begin_checkout'
  | 'search'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'category_view'
  | 'filter_apply'
  | 'sort_apply'
  | 'share'
  | 'review_submit'
  | 'coupon_apply'
  | 'exit_intent'
  | 'scroll_milestone'
  | 'click'
  | 'video_play'
  | 'image_zoom'
  | 'size_guide_open'
  | 'compare_view';

interface BehaviorEvent {
  event_type: BehaviorEventType;
  product_id?: string;
  category_id?: string;
  search_query?: string;
  page_url?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  device_type?: string;
  dwell_time_ms?: number;
  scroll_depth?: number;
  viewport_width?: number;
  viewport_height?: number;
  metadata?: Record<string, unknown>;
}

// ─── Utilities ─────────────────────────────────────────────────────
function getSessionId(): string {
  let id = sessionStorage.getItem('bt_session_id');
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('bt_session_id', id);
  }
  return id;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
    const v = params.get(k);
    if (v) utm[k] = v;
  });
  // Persist UTMs for the session
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem('bt_utm', JSON.stringify(utm));
  }
  return { ...JSON.parse(sessionStorage.getItem('bt_utm') || '{}'), ...utm };
}

// ─── Event Buffer (batched writes) ────────────────────────────────
const eventQueue: BehaviorEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_SIZE = 15;
const FLUSH_MS = 4000;

async function flushQueue(userId?: string) {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, eventQueue.length);
  const sessionId = getSessionId();

  const rows = batch.map(e => ({
    session_id: sessionId,
    user_id: userId || null,
    event_type: e.event_type,
    product_id: e.product_id || null,
    category_id: e.category_id || null,
    search_query: e.search_query || null,
    page_url: e.page_url || window.location.pathname,
    referrer: e.referrer || document.referrer || null,
    utm_source: e.utm_source || null,
    utm_medium: e.utm_medium || null,
    utm_campaign: e.utm_campaign || null,
    utm_content: e.utm_content || null,
    utm_term: e.utm_term || null,
    device_type: e.device_type || getDeviceType(),
    dwell_time_ms: e.dwell_time_ms || null,
    scroll_depth: e.scroll_depth || null,
    viewport_width: e.viewport_width || window.innerWidth,
    viewport_height: e.viewport_height || window.innerHeight,
    metadata: (e.metadata || {}) as Json,
  }));

  try {
    await supabase.from('user_behavior_events').insert(rows);
  } catch {
    // Never break the app for tracking
  }
}

function scheduleFlush(userId?: string) {
  if (flushTimeout) clearTimeout(flushTimeout);
  if (eventQueue.length >= BATCH_SIZE) {
    flushQueue(userId);
    return;
  }
  flushTimeout = setTimeout(() => flushQueue(userId), FLUSH_MS);
}

function enqueue(event: BehaviorEvent, userId?: string) {
  eventQueue.push(event);
  scheduleFlush(userId);
}

// ─── Main Hook ─────────────────────────────────────────────────────
export function useAdvancedBehaviorTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const userId = user?.id;

  // Page-level tracking refs
  const pageEntryRef = useRef<number>(Date.now());
  const scrollMilestonesRef = useRef<Set<number>>(new Set());
  const lastPathRef = useRef<string>('');

  // ─── Auto page view on route change ─────────────────────────────
  useEffect(() => {
    const now = Date.now();
    const utm = getUtmParams();

    // Record dwell time for previous page
    if (lastPathRef.current && lastPathRef.current !== location.pathname) {
      const dwellMs = now - pageEntryRef.current;
      if (dwellMs > 1000) {
        enqueue({
          event_type: 'page_view',
          page_url: lastPathRef.current,
          dwell_time_ms: dwellMs,
          scroll_depth: Math.max(...Array.from(scrollMilestonesRef.current), 0),
          ...utm,
        }, userId);
      }
    }

    // Reset for new page
    pageEntryRef.current = now;
    scrollMilestonesRef.current = new Set();
    lastPathRef.current = location.pathname;

    // Track new page view
    enqueue({
      event_type: 'page_view',
      page_url: location.pathname,
      referrer: document.referrer || undefined,
      ...utm,
      metadata: { search: location.search, hash: location.hash },
    }, userId);
  }, [location.pathname, userId]);

  // ─── Auto scroll depth tracking ────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      const pct = Math.round((window.scrollY / docH) * 100);
      [25, 50, 75, 90, 100].forEach(m => {
        if (pct >= m && !scrollMilestonesRef.current.has(m)) {
          scrollMilestonesRef.current.add(m);
          enqueue({
            event_type: 'scroll_milestone',
            page_url: location.pathname,
            scroll_depth: m,
          }, userId);
        }
      });
    };

    // Throttle scroll events
    let ticking = false;
    const throttled = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
      }
    };

    window.addEventListener('scroll', throttled, { passive: true });
    return () => window.removeEventListener('scroll', throttled);
  }, [location.pathname, userId]);

  // ─── Exit intent detection ──────────────────────────────────────
  useEffect(() => {
    let fired = false;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !fired) {
        fired = true;
        enqueue({
          event_type: 'exit_intent',
          page_url: location.pathname,
          dwell_time_ms: Date.now() - pageEntryRef.current,
          metadata: { scroll_depth: Math.max(...Array.from(scrollMilestonesRef.current), 0) },
        }, userId);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [location.pathname, userId]);

  // ─── Flush on visibility change / unload ────────────────────────
  useEffect(() => {
    const flush = () => {
      // Send final dwell time
      const dwellMs = Date.now() - pageEntryRef.current;
      if (dwellMs > 1000) {
        enqueue({
          event_type: 'page_view',
          page_url: location.pathname,
          dwell_time_ms: dwellMs,
          scroll_depth: Math.max(...Array.from(scrollMilestonesRef.current), 0),
          metadata: { is_exit: true },
        }, userId);
      }
      flushQueue(userId);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [userId, location.pathname]);

  // ─── Manual tracking methods ────────────────────────────────────
  const trackProductView = useCallback((productId: string, categoryId?: string, metadata?: Record<string, unknown>) => {
    enqueue({ event_type: 'product_view', product_id: productId, category_id: categoryId, metadata }, userId);
  }, [userId]);

  const trackProductImpression = useCallback((productId: string, position: number, listName: string) => {
    enqueue({
      event_type: 'product_impression',
      product_id: productId,
      metadata: { position, list_name: listName },
    }, userId);
  }, [userId]);

  const trackAddToCart = useCallback((productId: string, quantity: number, price: number, variant?: string) => {
    enqueue({
      event_type: 'add_to_cart',
      product_id: productId,
      metadata: { quantity, price, value: price * quantity, variant },
    }, userId);
  }, [userId]);

  const trackRemoveFromCart = useCallback((productId: string, quantity: number) => {
    enqueue({ event_type: 'remove_from_cart', product_id: productId, metadata: { quantity } }, userId);
  }, [userId]);

  const trackPurchase = useCallback((orderId: string, total: number, items: Array<{ product_id: string; quantity: number; price: number }>) => {
    items.forEach(item => {
      enqueue({
        event_type: 'purchase',
        product_id: item.product_id,
        metadata: { order_id: orderId, total, quantity: item.quantity, price: item.price },
      }, userId);
    });
  }, [userId]);

  const trackBeginCheckout = useCallback((value: number, itemCount: number) => {
    enqueue({ event_type: 'begin_checkout', metadata: { value, items_count: itemCount } }, userId);
  }, [userId]);

  const trackSearch = useCallback((query: string, resultsCount: number, filters?: Record<string, unknown>) => {
    enqueue({ event_type: 'search', search_query: query, metadata: { results_count: resultsCount, ...filters } }, userId);
  }, [userId]);

  const trackWishlistAdd = useCallback((productId: string) => {
    enqueue({ event_type: 'wishlist_add', product_id: productId }, userId);
  }, [userId]);

  const trackWishlistRemove = useCallback((productId: string) => {
    enqueue({ event_type: 'wishlist_remove', product_id: productId }, userId);
  }, [userId]);

  const trackCategoryView = useCallback((categoryId: string, categoryName: string) => {
    enqueue({ event_type: 'category_view', category_id: categoryId, metadata: { category_name: categoryName } }, userId);
  }, [userId]);

  const trackFilterApply = useCallback((filters: Record<string, unknown>) => {
    enqueue({ event_type: 'filter_apply', metadata: filters }, userId);
  }, [userId]);

  const trackSortApply = useCallback((sortBy: string) => {
    enqueue({ event_type: 'sort_apply', metadata: { sort_by: sortBy } }, userId);
  }, [userId]);

  const trackShare = useCallback((productId: string, platform: string) => {
    enqueue({ event_type: 'share', product_id: productId, metadata: { platform } }, userId);
  }, [userId]);

  const trackCouponApply = useCallback((code: string, discount: number, success: boolean) => {
    enqueue({ event_type: 'coupon_apply', metadata: { code, discount, success } }, userId);
  }, [userId]);

  const trackClick = useCallback((element: string, context?: string, productId?: string) => {
    enqueue({ event_type: 'click', product_id: productId, metadata: { element, context } }, userId);
  }, [userId]);

  const trackImageZoom = useCallback((productId: string, imageIndex: number) => {
    enqueue({ event_type: 'image_zoom', product_id: productId, metadata: { image_index: imageIndex } }, userId);
  }, [userId]);

  const trackSizeGuideOpen = useCallback((productId: string) => {
    enqueue({ event_type: 'size_guide_open', product_id: productId }, userId);
  }, [userId]);

  return {
    // Auto-tracked: page_view, scroll_milestone, exit_intent, dwell_time
    // Manual:
    trackProductView,
    trackProductImpression,
    trackAddToCart,
    trackRemoveFromCart,
    trackPurchase,
    trackBeginCheckout,
    trackSearch,
    trackWishlistAdd,
    trackWishlistRemove,
    trackCategoryView,
    trackFilterApply,
    trackSortApply,
    trackShare,
    trackCouponApply,
    trackClick,
    trackImageZoom,
    trackSizeGuideOpen,
  };
}

// ─── Intersection Observer for Product Impressions ─────────────────
export function useProductImpressionTracker(listName: string) {
  const { trackProductImpression } = useAdvancedBehaviorTracker();
  const trackedRef = useRef<Set<string>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const productId = el.dataset.productId;
            const position = parseInt(el.dataset.position || '0', 10);
            if (productId && !trackedRef.current.has(productId)) {
              trackedRef.current.add(productId);
              trackProductImpression(productId, position, listName);
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: '0px' }
    );

    return () => observerRef.current?.disconnect();
  }, [listName, trackProductImpression]);

  const observeElement = useCallback((el: HTMLElement | null) => {
    if (el && observerRef.current) {
      observerRef.current.observe(el);
    }
  }, []);

  return { observeElement };
}

// ─── Hook to update behavior profile periodically ──────────────────
export function useBehaviorProfileSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Update profile on session start and every 5 minutes
    const sync = async () => {
      try {
        await supabase.rpc('update_behavior_profile', { p_user_id: user.id });
      } catch {
        // Silent fail
      }
    };

    sync();
    const interval = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);
}
