/**
 * Centralised abuse guard.
 *
 * Combines:
 *  - Browser fingerprint (best-effort, non-identifying) for keying buckets
 *    when there's no authenticated user.
 *  - Token-bucket rate limiting per (action, subject).
 *  - Local lockout window after N consecutive failures, persisted to
 *    sessionStorage so refreshes don't reset abuse counters within a session.
 *
 * Server-side rate_limits + login_lockouts remain the source of truth — this
 * layer cuts the noise before requests leave the browser.
 */
import { consume, RateLimitError, type RateLimitOptions } from "./rateLimit";

const LOCKOUT_PREFIX = "abuse_guard:lockout:";
const FAIL_PREFIX = "abuse_guard:fails:";

export interface AbusePolicy extends RateLimitOptions {
  /** Consecutive failures before a lockout kicks in. */
  failuresBeforeLockout: number;
  /** Lockout duration in ms. */
  lockoutMs: number;
}

export const POLICIES = {
  authLogin: { capacity: 5, refillPerSec: 0.05, failuresBeforeLockout: 5, lockoutMs: 15 * 60_000 },
  authSignup: { capacity: 3, refillPerSec: 0.02, failuresBeforeLockout: 3, lockoutMs: 60 * 60_000 },
  passwordReset: { capacity: 3, refillPerSec: 0.01, failuresBeforeLockout: 5, lockoutMs: 30 * 60_000 },
  contactForm: { capacity: 3, refillPerSec: 0.01, failuresBeforeLockout: 5, lockoutMs: 30 * 60_000 },
  newsletter: { capacity: 3, refillPerSec: 0.05, failuresBeforeLockout: 5, lockoutMs: 10 * 60_000 },
  search: { capacity: 30, refillPerSec: 5, failuresBeforeLockout: 0, lockoutMs: 0 },
  reviewPost: { capacity: 5, refillPerSec: 0.05, failuresBeforeLockout: 5, lockoutMs: 30 * 60_000 },
  couponApply: { capacity: 10, refillPerSec: 0.2, failuresBeforeLockout: 10, lockoutMs: 10 * 60_000 },
  otpRequest: { capacity: 3, refillPerSec: 0.01, failuresBeforeLockout: 3, lockoutMs: 30 * 60_000 },
} satisfies Record<string, AbusePolicy>;

export type AbuseAction = keyof typeof POLICIES;

let fingerprintCache: string | null = null;
async function browserFingerprint(): Promise<string> {
  if (fingerprintCache) return fingerprintCache;
  if (typeof window === "undefined") return "ssr";
  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency ?? 0,
  ].join("|");
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
    fingerprintCache = Array.from(new Uint8Array(buf))
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    fingerprintCache = String(parts.length);
  }
  return fingerprintCache;
}

function lockoutKey(action: string, subject: string) {
  return `${LOCKOUT_PREFIX}${action}:${subject}`;
}
function failKey(action: string, subject: string) {
  return `${FAIL_PREFIX}${action}:${subject}`;
}

function safeStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export class AbuseLockoutError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`Locked out for ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "AbuseLockoutError";
  }
}

export async function guard(action: AbuseAction, subject?: string): Promise<void> {
  const policy = POLICIES[action];
  const subj = subject ?? (await browserFingerprint());
  const store = safeStorage();

  if (store) {
    const until = Number(store.getItem(lockoutKey(action, subj)) ?? 0);
    if (until > Date.now()) {
      throw new AbuseLockoutError(until - Date.now());
    }
  }

  if (!consume(`${action}:${subj}`, policy)) {
    throw new RateLimitError(`Too many ${action} attempts. Please wait.`);
  }
}

export function recordFailure(action: AbuseAction, subject = "anon"): void {
  const policy = POLICIES[action];
  if (!policy.failuresBeforeLockout) return;
  const store = safeStorage();
  if (!store) return;
  const k = failKey(action, subject);
  const next = Number(store.getItem(k) ?? 0) + 1;
  store.setItem(k, String(next));
  if (next >= policy.failuresBeforeLockout) {
    store.setItem(lockoutKey(action, subject), String(Date.now() + policy.lockoutMs));
    store.removeItem(k);
  }
}

export function recordSuccess(action: AbuseAction, subject = "anon"): void {
  const store = safeStorage();
  if (!store) return;
  store.removeItem(failKey(action, subject));
  store.removeItem(lockoutKey(action, subject));
}

/** Higher-order helper that wraps an async action with guard + failure tracking. */
export function withAbuseGuard<TArgs extends unknown[], TResult>(
  action: AbuseAction,
  fn: (...args: TArgs) => Promise<TResult>,
  subjectFn?: (...args: TArgs) => string | undefined,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const subject = subjectFn?.(...args);
    await guard(action, subject);
    try {
      const result = await fn(...args);
      recordSuccess(action, subject ?? "anon");
      return result;
    } catch (err) {
      recordFailure(action, subject ?? "anon");
      throw err;
    }
  };
}

export { RateLimitError } from "./rateLimit";
