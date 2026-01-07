interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  // eslint-disable-next-line no-unused-vars
  keyGenerator?: (request: Request) => string;
}

interface RateLimitData {
  requests: number[];
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitData>();

export const rateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (request: Request) => {
      // Get IP address from request headers
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded
        ? forwarded.split(',')[0]
        : request.headers.get('x-real-ip') || 'unknown';
      return ip;
    },
  } = options;

  return (request: Request) => {
    const key = keyGenerator(request);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit data for this key
    const rateLimitData = rateLimitMap.get(key) || { requests: [], resetTime: now + windowMs };

    // Clean up old requests outside the window
    rateLimitData.requests = rateLimitData.requests.filter(
      (timestamp: number) => timestamp > windowStart
    );

    // Check if limit exceeded
    if (rateLimitData.requests.length >= max) {
      return {
        success: false,
        error: {
          message,
          retryAfter: Math.ceil((rateLimitData.requests[0] + windowMs - now) / 1000),
        },
      };
    }

    // Add current request
    rateLimitData.requests.push(now);
    rateLimitMap.set(key, rateLimitData);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance
      for (const [k, v] of rateLimitMap.entries()) {
        if (v.resetTime < now) {
          rateLimitMap.delete(k);
        }
      }
    }

    return { success: true };
  };
};

// Predefined rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later.',
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please slow down.',
});

// Test helper to reset rate limit state between tests
export const __resetRateLimitMap = () => {
  rateLimitMap.clear();
};
