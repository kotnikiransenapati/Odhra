import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type EventType = 
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'search'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'signup'
  | 'login'
  | 'share'
  | 'click'
  | 'impression'
  | 'scroll_depth'
  | 'time_on_page'
  | 'exit_intent'
  | 'promo_code_applied'
  | 'experiment_exposure';

interface AnalyticsEvent {
  event_type: EventType;
  properties?: Record<string, any>;
  timestamp?: string;
}

// In-memory buffer for batched events
const eventBuffer: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

function getSessionId(): string {
  let id = sessionStorage.getItem('analytics_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', id);
  }
  return id;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  return {
    device_type: isMobile ? 'mobile' : 'desktop',
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    language: navigator.language,
    user_agent: ua,
  };
}

async function flushEvents(userId?: string) {
  if (eventBuffer.length === 0) return;
  
  const events = [...eventBuffer];
  eventBuffer.length = 0;

  const sessionId = getSessionId();
  const device = getDeviceInfo();

  const rows = events.map(e => ({
    session_id: sessionId,
    user_id: userId || null,
    event_type: e.event_type,
    properties: {
      ...e.properties,
      ...device,
      page_url: window.location.pathname,
      referrer: document.referrer || null,
    },
    created_at: e.timestamp || new Date().toISOString(),
  }));

  try {
    await (supabase.from('analytics_events' as any) as any).insert(rows);
  } catch (err) {
    // Silently fail - analytics should never break the app
    console.debug('Analytics flush failed:', err);
  }
}

function scheduleFlush(userId?: string) {
  if (flushTimer) clearTimeout(flushTimer);
  
  if (eventBuffer.length >= BUFFER_SIZE) {
    flushEvents(userId);
    return;
  }
  
  flushTimer = setTimeout(() => flushEvents(userId), FLUSH_INTERVAL);
}

export function useAnalyticsTracker() {
  const { user } = useAuth();
  const userId = user?.id;

  // Flush on unmount / page hide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEvents(userId);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => flushEvents(userId));
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushEvents(userId);
    };
  }, [userId]);

  const track = useCallback((eventType: EventType, properties?: Record<string, any>) => {
    eventBuffer.push({
      event_type: eventType,
      properties,
      timestamp: new Date().toISOString(),
    });
    scheduleFlush(userId);
  }, [userId]);

  const trackPageView = useCallback((pageName: string, properties?: Record<string, any>) => {
    track('page_view', { page_name: pageName, ...properties });
  }, [track]);

  const trackProductView = useCallback((productId: string, productName: string, price: number, category?: string) => {
    track('product_view', { product_id: productId, product_name: productName, price, category });
  }, [track]);

  const trackAddToCart = useCallback((productId: string, productName: string, price: number, quantity: number) => {
    track('add_to_cart', { product_id: productId, product_name: productName, price, quantity, value: price * quantity });
  }, [track]);

  const trackPurchase = useCallback((orderId: string, total: number, items: number) => {
    track('purchase', { order_id: orderId, total, items_count: items });
  }, [track]);

  const trackSearch = useCallback((query: string, resultsCount: number) => {
    track('search', { query, results_count: resultsCount });
  }, [track]);

  const trackExperiment = useCallback((experimentId: string, variant: string) => {
    track('experiment_exposure', { experiment_id: experimentId, variant });
  }, [track]);

  return {
    track,
    trackPageView,
    trackProductView,
    trackAddToCart,
    trackPurchase,
    trackSearch,
    trackExperiment,
  };
}

// Experiment framework
interface Experiment {
  id: string;
  variants: string[];
  weights?: number[]; // must sum to 1
}

const experimentAssignments = new Map<string, string>();

export function getExperimentVariant(experiment: Experiment): string {
  const cached = experimentAssignments.get(experiment.id);
  if (cached) return cached;

  // Check localStorage for persistent assignment
  const stored = localStorage.getItem(`exp_${experiment.id}`);
  if (stored && experiment.variants.includes(stored)) {
    experimentAssignments.set(experiment.id, stored);
    return stored;
  }

  // Assign based on weights or uniformly
  const rand = Math.random();
  const weights = experiment.weights || experiment.variants.map(() => 1 / experiment.variants.length);
  let cumulative = 0;
  let assigned = experiment.variants[0];

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) {
      assigned = experiment.variants[i];
      break;
    }
  }

  experimentAssignments.set(experiment.id, assigned);
  localStorage.setItem(`exp_${experiment.id}`, assigned);
  return assigned;
}

export function useExperiment(experimentId: string, variants: string[], weights?: number[]) {
  const { trackExperiment } = useAnalyticsTracker();
  const variantRef = useRef<string | null>(null);

  if (!variantRef.current) {
    variantRef.current = getExperimentVariant({ id: experimentId, variants, weights });
  }

  useEffect(() => {
    if (variantRef.current) {
      trackExperiment(experimentId, variantRef.current);
    }
  }, [experimentId, trackExperiment]);

  return variantRef.current;
}
