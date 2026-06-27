/**
 * Exit-intent detector — desktop pointer-leave + mobile back-button intent.
 *
 * Fires `onIntent()` at most once per session for the given `key`.
 * Respects: prefers-reduced-motion users, programmatic dismissal,
 * minimum dwell time, and a cool-down after dismissal.
 */

export interface ExitIntentOptions {
  /** Stable key for sessionStorage de-dup. */
  key: string;
  /** Minimum ms on page before intent can fire. Default 8s. */
  minDwellMs?: number;
  /** Cool-down ms after the user dismisses the offer. Default 1 day. */
  cooldownMs?: number;
  /** y-position threshold (px from top) below which a pointer leave counts. */
  topThresholdPx?: number;
}

const SESSION_FIRED = (k: string) => `odhra.exitintent.fired.${k}`;
const LOCAL_DISMISSED = (k: string) => `odhra.exitintent.dismissed.${k}`;

export function hasRecentlyDismissed(key: string, cooldownMs: number): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_DISMISSED(key));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < cooldownMs;
  } catch {
    return false;
  }
}

export function markDismissed(key: string) {
  try {
    localStorage.setItem(LOCAL_DISMISSED(key), String(Date.now()));
  } catch { /* ignore */ }
}

export function attachExitIntent(
  onIntent: () => void,
  opts: ExitIntentOptions,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const {
    key,
    minDwellMs = 8_000,
    cooldownMs = 24 * 60 * 60 * 1000,
    topThresholdPx = 20,
  } = opts;

  if (hasRecentlyDismissed(key, cooldownMs)) return () => {};
  try {
    if (sessionStorage.getItem(SESSION_FIRED(key))) return () => {};
  } catch { /* ignore */ }

  const mountedAt = Date.now();
  let fired = false;

  const fire = () => {
    if (fired) return;
    if (Date.now() - mountedAt < minDwellMs) return;
    fired = true;
    try { sessionStorage.setItem(SESSION_FIRED(key), '1'); } catch { /* ignore */ }
    onIntent();
  };

  // Desktop: pointer moves above viewport
  const onPointerOut = (e: PointerEvent) => {
    if (e.relatedTarget) return;
    if (e.clientY > topThresholdPx) return;
    fire();
  };

  // Mobile: history-pop intent (user hits back) — push sentinel, listen popstate
  const sentinel = { exitIntent: true, ts: Date.now() };
  let pushedSentinel = false;
  const isCoarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (isCoarse) {
    try {
      history.pushState(sentinel, '');
      pushedSentinel = true;
    } catch { /* ignore */ }
  }
  const onPopState = () => {
    if (!pushedSentinel) return;
    // Re-push so the user doesn't actually navigate away yet
    try { history.pushState(sentinel, ''); } catch { /* ignore */ }
    fire();
  };

  // Tab-hide as a secondary trigger when cart has value
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') fire();
  };

  document.addEventListener('pointerout', onPointerOut, { passive: true });
  window.addEventListener('popstate', onPopState);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    document.removeEventListener('pointerout', onPointerOut);
    window.removeEventListener('popstate', onPopState);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
