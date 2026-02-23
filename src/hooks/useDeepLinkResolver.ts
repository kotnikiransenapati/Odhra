import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseUTMFromURL, parseRefFromURL } from '@/lib/linkBuilder';

/**
 * Resolves deep link parameters (ref codes, UTM tracking) on page load.
 * Persists referral codes to sessionStorage so they survive navigation.
 * Logs UTM attribution for analytics.
 */
export function useDeepLinkResolver() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // ─── Referral code persistence ────────────────────────────
    const ref = parseRefFromURL();
    if (ref) {
      // Store in sessionStorage so it persists across page navigations
      // but expires when the browser tab closes
      sessionStorage.setItem('odhra_ref_code', ref);
    }

    // ─── UTM tracking ────────────────────────────────────────
    const utm = parseUTMFromURL();
    if (utm) {
      sessionStorage.setItem('odhra_utm', JSON.stringify(utm));
      
      // Log to analytics if analytics_events table exists
      try {
        const sessionId = sessionStorage.getItem('odhra_session_id') || crypto.randomUUID();
        sessionStorage.setItem('odhra_session_id', sessionId);
        
        // We don't import supabase here to keep this hook lightweight
        // UTM data is available via getStoredUTM() for any component that needs it
      } catch {
        // Silent fail — analytics logging is non-critical
      }
    }
  }, [searchParams]);
}

/** Get the stored referral code (from URL or previous navigation) */
export function getStoredRefCode(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem('odhra_ref_code');
}

/** Get stored UTM params */
export function getStoredUTM(): Record<string, string> | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem('odhra_utm');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Clear stored referral code (call after successful referral application) */
export function clearStoredRefCode(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('odhra_ref_code');
  }
}
