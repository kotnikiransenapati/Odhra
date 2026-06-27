/**
 * Token-bucket rate limiter for client-initiated actions
 * (form submissions, search queries, retry storms). Pairs with the
 * server-side rate_limits table for defence-in-depth.
 */

type Bucket = { tokens: number; updatedAt: number };

export interface RateLimitOptions {
  /** Max tokens (burst capacity). */
  capacity: number;
  /** Tokens refilled per second. */
  refillPerSec: number;
}

const buckets = new Map<string, Bucket>();

export function consume(key: string, opts: RateLimitOptions, cost = 1): boolean {
  const now = Date.now();
  const existing = buckets.get(key) ?? { tokens: opts.capacity, updatedAt: now };
  const elapsed = (now - existing.updatedAt) / 1000;
  const refilled = Math.min(opts.capacity, existing.tokens + elapsed * opts.refillPerSec);
  if (refilled < cost) {
    buckets.set(key, { tokens: refilled, updatedAt: now });
    return false;
  }
  buckets.set(key, { tokens: refilled - cost, updatedAt: now });
  return true;
}

export function reset(key: string): void {
  buckets.delete(key);
}

export function withRateLimit<TArgs extends unknown[], TResult>(
  key: string,
  opts: RateLimitOptions,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    if (!consume(key, opts)) {
      throw new RateLimitError(`Rate limit exceeded for "${key}"`);
    }
    return fn(...args);
  };
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
