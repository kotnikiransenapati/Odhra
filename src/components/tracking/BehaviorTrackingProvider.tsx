import { useAdvancedBehaviorTracker, useBehaviorProfileSync } from '@/hooks/useAdvancedBehaviorTracker';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { createContext, useContext } from 'react';

type TrackerContextType = ReturnType<typeof useAdvancedBehaviorTracker>;

const TrackerContext = createContext<TrackerContextType | null>(null);

/**
 * Inner component that actually runs the tracking hooks. Mounted only when
 * the `behavior_tracking` feature flag is enabled, so disabling the flag
 * fully suspends auto-tracking (page views, scroll depth, exit intent,
 * profile sync) — not just the manual tracker context.
 */
function ActiveTracker({ children }: { children: React.ReactNode }) {
  const tracker = useAdvancedBehaviorTracker();
  useBehaviorProfileSync();
  return <TrackerContext.Provider value={tracker}>{children}</TrackerContext.Provider>;
}

/**
 * Wraps the app to provide automatic + manual behavior tracking.
 * Auto-tracks: page views, scroll depth, dwell time, exit intent, UTM params.
 * Provides manual methods via useTracker() for product views, cart, search, etc.
 * Fully gated behind the `behavior_tracking` feature flag.
 */
export function BehaviorTrackingProvider({ children }: { children: React.ReactNode }) {
  const { isEnabled } = useFeatureFlag('behavior_tracking');

  if (!isEnabled) {
    return <TrackerContext.Provider value={null}>{children}</TrackerContext.Provider>;
  }

  return <ActiveTracker>{children}</ActiveTracker>;
}

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) {
    // Return no-op functions when outside provider or when tracking is disabled
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
