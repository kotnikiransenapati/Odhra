import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

type EventType = 'view' | 'add_to_cart' | 'purchase' | 'wishlist' | 'search' | 'remove_from_cart';

interface TrackEventParams {
  eventType: EventType;
  productId?: string;
  categoryId?: string;
  searchQuery?: string;
  metadata?: Record<string, unknown>;
}

export function useBehaviorTracking() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('behavior_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('behavior_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;
  }, []);

  const trackEvent = useCallback(async ({
    eventType,
    productId,
    categoryId,
    searchQuery,
    metadata = {}
  }: TrackEventParams) => {
    try {
      const { error } = await supabase
        .from('user_behavior_events')
        .insert([{
          event_type: eventType,
          session_id: sessionIdRef.current,
          user_id: user?.id,
          product_id: productId,
          category_id: categoryId,
          search_query: searchQuery,
          metadata: metadata as Json
        }]);
      if (error) {
        console.error('Failed to track event:', error);
      }
    } catch (err) {
      console.error('Behavior tracking error:', err);
    }
  }, [user?.id]);

  const trackProductView = useCallback((productId: string, categoryId?: string) => {
    trackEvent({
      eventType: 'view',
      productId,
      categoryId
    });
  }, [trackEvent]);

  const trackAddToCart = useCallback((productId: string, quantity: number = 1) => {
    trackEvent({
      eventType: 'add_to_cart',
      productId,
      metadata: { quantity }
    });
  }, [trackEvent]);

  const trackRemoveFromCart = useCallback((productId: string) => {
    trackEvent({
      eventType: 'remove_from_cart',
      productId
    });
  }, [trackEvent]);

  const trackPurchase = useCallback((productIds: string[], orderId: string, totalAmount: number) => {
    productIds.forEach(productId => {
      trackEvent({
        eventType: 'purchase',
        productId,
        metadata: { orderId, totalAmount }
      });
    });
  }, [trackEvent]);

  const trackWishlist = useCallback((productId: string) => {
    trackEvent({
      eventType: 'wishlist',
      productId
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount?: number) => {
    trackEvent({
      eventType: 'search',
      searchQuery: query,
      metadata: { resultsCount }
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackPurchase,
    trackWishlist,
    trackSearch
  };
}
