import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { prefetchForRoute } from "@/lib/perf/routePrefetch";
import { isDataSaverActive } from "@/hooks/useNetworkQuality";

/**
 * Mounts once; listens to location changes and warms likely-next route chunks.
 * Skips prefetch entirely when the user is on a slow link or has Data Saver on.
 */
export function RoutePrefetcher() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (isDataSaverActive()) return;
    // Defer to idle so prefetch never competes with the current paint.
    const ric =
      (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) {
      const id = ric(() => prefetchForRoute(pathname), { timeout: 2000 });
      return () => {
        const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        cic?.(id);
      };
    }
    const t = window.setTimeout(() => prefetchForRoute(pathname), 800);
    return () => window.clearTimeout(t);
  }, [pathname]);
  return null;
}

export default RoutePrefetcher;

