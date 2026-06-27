import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { prefetchForRoute } from "@/lib/perf/routePrefetch";

/**
 * Mounts once; listens to location changes and warms likely-next route chunks.
 */
export function RoutePrefetcher() {
  const { pathname } = useLocation();
  useEffect(() => {
    prefetchForRoute(pathname);
  }, [pathname]);
  return null;
}

export default RoutePrefetcher;
