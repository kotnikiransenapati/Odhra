import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseUTMFromURL, parseRefFromURL } from '@/lib/linkBuilder';
import { captureRef, getCapturedRef, clearCapturedRef } from '@/lib/referral/captureRef';

/**
 * Resolves deep link parameters (ref codes, UTM tracking) on page load.
 * Referral codes are persisted via `captureRef` (localStorage, 30-day TTL) so
 * they survive tab close and full signup flows, not just sessionStorage.
 */
export function useDeepLinkResolver() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // ─── Referral code persistence ────────────────────────────
    const ref = parseRefFromURL();
    if (ref) captureRef(ref);

    // ─── UTM tracking ────────────────────────────────────────
    const utm = parseUTMFromURL();
    if (utm) {
      try {
        sessionStorage.setItem('odhra_utm', JSON.stringify(utm));
        const sessionId = sessionStorage.getItem('odhra_session_id') || crypto.randomUUID();
        sessionStorage.setItem('odhra_session_id', sessionId);
      } catch {
        /* silent — non-critical */
      }
    }
  }, [searchParams]);
}

/** Get the stored referral code (URL capture or previous visit, 30-day TTL). */
export function getStoredRefCode(): string | null {
  return getCapturedRef();
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
  clearCapturedRef();
}

