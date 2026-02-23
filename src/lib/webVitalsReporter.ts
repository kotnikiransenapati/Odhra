import { supabase } from '@/integrations/supabase/client';

/**
 * Reports Core Web Vitals (CWV) to the analytics_events table.
 * Called once after the page is fully loaded.
 */
export function reportWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  const metrics: Record<string, number | null> = {
    fcp: null,
    lcp: null,
    cls: null,
    ttfb: null,
  };

  const observers: PerformanceObserver[] = [];

  try {
    // FCP
    const fcpObs = new PerformanceObserver((list) => {
      const fcp = list.getEntries().find(e => e.name === 'first-contentful-paint');
      if (fcp) metrics.fcp = Math.round(fcp.startTime);
    });
    fcpObs.observe({ type: 'paint', buffered: true });
    observers.push(fcpObs);

    // LCP
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length) metrics.lcp = Math.round(entries[entries.length - 1].startTime);
    });
    lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(lcpObs);

    // CLS
    let clsValue = 0;
    const clsObs = new PerformanceObserver((list) => {
      const entries = list.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[];
      entries.forEach(e => {
        if (!e.hadRecentInput && e.value) clsValue += e.value;
      });
      metrics.cls = Math.round(clsValue * 1000) / 1000;
    });
    clsObs.observe({ type: 'layout-shift', buffered: true });
    observers.push(clsObs);

    // TTFB
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      metrics.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
    }
  } catch {
    // Observer not supported
  }

  // Flush metrics after page is settled
  const flush = () => {
    observers.forEach(o => o.disconnect());

    // Only report if we have at least one metric
    const hasData = Object.values(metrics).some(v => v !== null);
    if (!hasData) return;

    const sessionId = sessionStorage.getItem('analytics_session_id') || 'unknown';

    try {
      (supabase.from('analytics_events' as any) as any)
        .insert({
          session_id: sessionId,
          event_type: 'web_vitals',
          properties: {
            fcp_ms: metrics.fcp,
            lcp_ms: metrics.lcp,
            cls: metrics.cls,
            ttfb_ms: metrics.ttfb,
            page_url: window.location.pathname,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            connection: (navigator as any).connection?.effectiveType || 'unknown',
          },
        })
        .then(() => {});
    } catch {
      // Silently fail
    }
  };

  if (document.readyState === 'complete') {
    setTimeout(flush, 3000);
  } else {
    window.addEventListener('load', () => setTimeout(flush, 3000), { once: true });
  }
}
