/**
 * Captured referral code, stored with a 30-day TTL in localStorage so it
 * survives tab close, deep links, and the full signup flow.
 *
 * Replaces the older sessionStorage-only path while remaining backwards
 * compatible: `getCapturedRef()` falls back to the legacy key if present.
 */

const KEY = "odhra_ref_code_v2";
const LEGACY_SESSION_KEY = "odhra_ref_code";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredRef {
  code: string;
  capturedAt: number;
}

function readStorage(): StoredRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredRef;
      if (Date.now() - parsed.capturedAt < TTL_MS && parsed.code) return parsed;
      localStorage.removeItem(KEY);
    }
    const legacy = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (legacy) return { code: legacy, capturedAt: Date.now() };
  } catch {
    /* ignore */
  }
  return null;
}

export function captureRef(code: string): void {
  if (!code) return;
  const normalized = code.trim().toUpperCase().slice(0, 32);
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalized)) return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ code: normalized, capturedAt: Date.now() } satisfies StoredRef),
    );
  } catch {
    /* ignore */
  }
}

export function getCapturedRef(): string | null {
  return readStorage()?.code ?? null;
}

export function clearCapturedRef(): void {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
