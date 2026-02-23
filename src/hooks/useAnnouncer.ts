import { useCallback } from 'react';

/**
 * Accessibility announcer hook — pushes messages to an ARIA live region
 * so screen readers announce dynamic changes (route changes, toasts, etc.)
 */
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = document.getElementById('aria-live-region');
    if (!region) return;

    region.setAttribute('aria-live', priority);
    // Clear then set to force re-announcement
    region.textContent = '';
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }, []);

  return announce;
}
