/**
 * Rate limiter for middleware.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, uses
 * Upstash Redis for durable, cross-instance rate limiting. Otherwise falls
 * back to in-memory (best-effort only; resets on cold start, not shared).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryCache = new Map<string, RateLimitRecord>();

// Clean up expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryCache.entries()) {
      if (record.resetAt < now) {
        memoryCache.delete(key);
      }
    }
  }, 60000);
}

function checkRateLimitMemory(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = memoryCache.get(identifier);

  if (!record || record.resetAt < now) {
    memoryCache.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}

// Upstash: lazy init only when env is set
let upstashLimiters: Map<string, Ratelimit> | null = null;

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!upstashLimiters) {
    upstashLimiters = new Map();
  }
  const key = `${limit}:${windowMs}`;
  if (!upstashLimiters.has(key)) {
    const redis = new Redis({ url, token });
    const windowSec = Math.max(1, Math.round(windowMs / 1000));
    upstashLimiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      })
    );
  }
  return upstashLimiters.get(key)!;
}

/**
 * Returns true if request should be allowed, false if rate limit exceeded.
 * Uses Upstash Redis when env vars are set; otherwise in-memory (best-effort).
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limiter = getUpstashLimiter(limit, windowMs);
  if (limiter) {
    try {
      const { success, reset } = await limiter.limit(identifier);
      const retryAfter = success ? undefined : Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return { allowed: success, retryAfter };
    } catch (e) {
      console.warn('[MIDDLEWARE] Upstash rate limit error, falling back to allow', e);
      return { allowed: true };
    }
  }
  return checkRateLimitMemory(identifier, limit, windowMs);
}

/**
 * Reset the in-memory rate limit cache (useful for testing). Does not clear Upstash.
 */
export function resetRateLimitCache(): void {
  memoryCache.clear();
}
