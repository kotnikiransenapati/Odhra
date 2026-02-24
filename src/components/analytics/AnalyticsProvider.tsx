import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useUnifiedAnalytics } from '@/hooks/useAnalyticsIntegrations';
import { useSentryMonitoring } from '@/hooks/useSentryMonitoring';

/**
 * Invisible provider that initializes all analytics + monitoring integrations
 * and auto-tracks page views on route changes.
 * Respects cookie consent preferences before loading tracking scripts.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { trackPageView } = useUnifiedAnalytics();

  // Initialize Sentry (just mounting the hook is enough)
  useSentryMonitoring();

  // Auto-track page views on route change
  useEffect(() => {
    // Small delay to let page title update
    const timer = setTimeout(() => {
      trackPageView(location.pathname, document.title);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, trackPageView]);

  return <>{children}</>;
}
