/**
 * Lightweight in-memory rate limiter for middleware.
 *
 * WARNING: This is per-instance only and resets on cold starts.
 * For persistent rate limiting across instances, use Upstash Redis.
 *
 * This is meant as a first line of defense in middleware to block
 * obvious bot storms before they hit your API routes.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const cache = new Map<string, RateLimitRecord>();

// Clean up expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of cache.entries()) {
      if (record.resetAt < now) {
        cache.delete(key);
      }
    }
  }, 60000);
}

/**
 * Simple sliding window rate limiter.
 * Returns true if request should be allowed, false if rate limit exceeded.
 *
 * @param identifier - Unique identifier (e.g., IP address)
 * @param limit - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const cacheKey = identifier;
  const record = cache.get(cacheKey);

  // No record or expired window - allow and create new record
  if (!record || record.resetAt < now) {
    cache.set(cacheKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true };
  }

  // Limit exceeded
  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment and allow
  record.count += 1;
  return { allowed: true };
}

/**
 * Reset the rate limit cache (useful for testing)
 */
export function resetRateLimitCache(): void {
  cache.clear();
}
