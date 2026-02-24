import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUnifiedAnalytics } from '@/hooks/useAnalyticsIntegrations';
import { useSentryMonitoring } from '@/hooks/useSentryMonitoring';

/**
 * Invisible provider that initializes all analytics + monitoring integrations
 * and auto-tracks page views on route changes.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { trackPageView } = useUnifiedAnalytics();

  // Initialize Sentry (just mounting the hook is enough)
  useSentryMonitoring();

  // Auto-track page views on route change
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname, trackPageView]);

  return <>{children}</>;
}
