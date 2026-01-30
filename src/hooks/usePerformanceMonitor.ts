import { useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}

/**
 * Hook to monitor Core Web Vitals and performance metrics
 */
export function usePerformanceMonitor(onMetrics?: (metrics: PerformanceMetrics) => void) {
  const metricsRef = useRef<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observers: PerformanceObserver[] = [];

    try {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries.find(e => e.name === 'first-contentful-paint');
        if (fcp) {
          metricsRef.current.fcp = fcp.startTime;
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
      observers.push(fcpObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          metricsRef.current.lcp = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEventTiming;
        if (firstEntry) {
          metricsRef.current.fid = firstEntry.processingStart - firstEntry.startTime;
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      observers.push(fidObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput && entry.value) {
            clsValue += entry.value;
          }
        });
        metricsRef.current.cls = clsValue;
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);

      // Time to First Byte
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        metricsRef.current.ttfb = navEntry.responseStart - navEntry.requestStart;
      }

    } catch (e) {
      // Observer not supported
      console.debug('Performance monitoring not fully supported');
    }

    // Report metrics after page is fully loaded
    const reportMetrics = () => {
      if (onMetrics) {
        onMetrics(metricsRef.current);
      }
    };

    if (document.readyState === 'complete') {
      setTimeout(reportMetrics, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(reportMetrics, 1000));
    }

    return () => {
      observers.forEach(o => o.disconnect());
    };
  }, [onMetrics]);

  return metricsRef.current;
}

/**
 * Hook to defer non-critical operations until idle
 */
export function useDeferredTask() {
  const taskQueue = useRef<(() => void)[]>([]);
  const isProcessing = useRef(false);

  const processQueue = useCallback(() => {
    if (isProcessing.current || taskQueue.current.length === 0) return;
    
    isProcessing.current = true;
    
    const runTask = () => {
      const task = taskQueue.current.shift();
      if (task) {
        task();
        if (taskQueue.current.length > 0) {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(runTask, { timeout: 100 });
          } else {
            setTimeout(runTask, 0);
          }
        } else {
          isProcessing.current = false;
        }
      } else {
        isProcessing.current = false;
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runTask, { timeout: 100 });
    } else {
      setTimeout(runTask, 0);
    }
  }, []);

  const defer = useCallback((task: () => void) => {
    taskQueue.current.push(task);
    processQueue();
  }, [processQueue]);

  return defer;
}

/**
 * Hook for intersection-based lazy loading
 */
export function useLazyLoad<T extends HTMLElement>(
  onVisible: () => void,
  options: IntersectionObserverInit = {}
) {
  const elementRef = useRef<T>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasLoaded.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded.current) {
            hasLoaded.current = true;
            onVisible();
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [onVisible, options]);

  return elementRef;
}
