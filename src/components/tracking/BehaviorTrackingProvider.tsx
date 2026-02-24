import { useAdvancedBehaviorTracker, useBehaviorProfileSync } from '@/hooks/useAdvancedBehaviorTracker';
import { createContext, useContext } from 'react';

type TrackerContextType = ReturnType<typeof useAdvancedBehaviorTracker>;

const TrackerContext = createContext<TrackerContextType | null>(null);

/**
 * Wraps the app to provide automatic + manual behavior tracking.
 * Auto-tracks: page views, scroll depth, dwell time, exit intent, UTM params.
 * Provides manual methods via useTracker() for product views, cart, search, etc.
 */
export function BehaviorTrackingProvider({ children }: { children: React.ReactNode }) {
  const tracker = useAdvancedBehaviorTracker();
  useBehaviorProfileSync();

  return (
    <TrackerContext.Provider value={tracker}>
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) {
    // Return no-op functions when outside provider (SSR safety)
    return {
      trackProductView: () => {},
      trackProductImpression: () => {},
      trackAddToCart: () => {},
      trackRemoveFromCart: () => {},
      trackPurchase: () => {},
      trackBeginCheckout: () => {},
      trackSearch: () => {},
      trackWishlistAdd: () => {},
      trackWishlistRemove: () => {},
      trackCategoryView: () => {},
      trackFilterApply: () => {},
      trackSortApply: () => {},
      trackShare: () => {},
      trackCouponApply: () => {},
      trackClick: () => {},
      trackImageZoom: () => {},
      trackSizeGuideOpen: () => {},
    } as TrackerContextType;
  }
  return ctx;
}
