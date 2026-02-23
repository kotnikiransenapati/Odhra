/**
 * Client-side rate limiter to prevent abuse
 * Works alongside server-side rate limiting in the database
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimitEntry>();

/**
 * Check if an action is rate-limited on the client side
 * @param key - Unique identifier for the action (e.g., 'login', 'search')
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkClientRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Get remaining time until rate limit resets
 */
export function getRateLimitResetMs(key: string): number {
  const entry = limits.get(key);
  if (!entry) return 0;
  return Math.max(0, entry.resetAt - Date.now());
}

/**
 * Decorator for rate-limiting async functions
 */
export function rateLimited<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): T {
  return ((...args: any[]) => {
    if (!checkClientRateLimit(key, maxRequests, windowMs)) {
      const resetMs = getRateLimitResetMs(key);
      return Promise.reject(
        new Error(`Rate limited. Try again in ${Math.ceil(resetMs / 1000)} seconds.`)
      );
    }
    return fn(...args);
  }) as T;
}
