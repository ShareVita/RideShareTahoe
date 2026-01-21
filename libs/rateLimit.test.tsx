/**
 * @file rateLimit.test.ts
 * @description Unit tests for the rate limiting middleware, covering sliding window
 * logic, key generation priority, and pre-configured limiter instances.
 */

/**
 * Mock request structure representing a minimal HTTP Request.
 */
type RequestTypeMock = {
  headers: {
    map: Map<string, string | undefined>;
    // eslint-disable-next-line no-unused-vars
    get(key: string): string | undefined;
  };
};

/**
 * Mock response structure returned by the rate limiter.
 */
type ResponseTypeMock = {
  success: boolean;
  error?: {
    message: string;
    retryAfter?: number;
  };
};

/**
 * Configuration options for creating a rate limiter instance.
 */
type RateLimitOptionsMock = {
  max: number;
  windowMs?: number;
  // eslint-disable-next-line no-unused-vars
  keyGenerator?: (request: RequestTypeMock) => string;
};

/**
 * Function types for the limiter logic and factory.
 */
// eslint-disable-next-line no-unused-vars
type RequestHandler = (request: RequestTypeMock) => ResponseTypeMock;
// eslint-disable-next-line no-unused-vars
type RateLimitFactory = (options?: RateLimitOptionsMock) => RequestHandler;

/**
 * Shape of the imported rateLimit module.
 */
type RateLimitModule = {
  rateLimit: RateLimitFactory;
  authRateLimit: RequestHandler;
  apiRateLimit: RequestHandler;
  __resetRateLimitMap?: () => void;
};

let mod: RateLimitModule;
let rateLimit: RateLimitFactory;
let authRateLimit: RequestHandler;
let apiRateLimit: RequestHandler;

/**
 * Factory to create a mock RequestTypeMock.
 * Ensures headers are normalized to lowercase for consistent lookups.
 */
const mockRequest = (ip: string, headers: Record<string, string> = {}): RequestTypeMock => {
  const combinedHeaders = {
    ...headers,
    'x-real-ip': headers['x-real-ip'] || ip,
    'x-forwarded-for': headers['x-forwarded-for'],
  };

  return {
    headers: {
      map: new Map(
        Object.entries(combinedHeaders).map(([key, value]) => [key.toLowerCase(), value])
      ),
      get(key: string) {
        return this.map.get(key.toLowerCase());
      },
    },
  };
};

describe('rateLimit', () => {
  beforeEach(async () => {
    /**
     * Use isolated module loading to prevent state leakage between tests.
     * This ensures the internal Map of the rate limiter is fresh.
     */
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T10:00:00.000Z'));

    const imported = await import('./rateLimit');
    mod = imported as unknown as RateLimitModule;

    if (mod.__resetRateLimitMap) {
      mod.__resetRateLimitMap();
    }

    rateLimit = mod.rateLimit;
    authRateLimit = mod.authRateLimit;
    apiRateLimit = mod.apiRateLimit;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Core Limiting Logic', () => {
    it('should allow requests under the limit', () => {
      const limiter = rateLimit({ max: 5 });
      const req = mockRequest('1.1.1.1');

      for (let i = 0; i < 5; i++) {
        expect(limiter(req).success).toBe(true);
      }
    });

    it('should block requests over the limit', () => {
      const limiter = rateLimit({ max: 2 });
      const req = mockRequest('1.1.1.1');

      limiter(req);
      limiter(req);
      const result = limiter(req);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Too many requests');
    });

    it('should reset the limit after the window expires', () => {
      const windowMs = 60000;
      const limiter = rateLimit({ max: 1, windowMs });
      const req = mockRequest('1.1.1.1');

      expect(limiter(req).success).toBe(true);
      expect(limiter(req).success).toBe(false);

      jest.advanceTimersByTime(59000);
      expect(limiter(req).success).toBe(false);

      // Advance past the 60s window
      jest.advanceTimersByTime(1001);
      expect(limiter(req).success).toBe(true);
    });

    it('should calculate retryAfter correctly', () => {
      const windowMs = 60000;
      const limiter = rateLimit({ max: 2, windowMs });
      const req = mockRequest('1.1.1.1');

      limiter(req); // T=0s

      jest.advanceTimersByTime(10000);
      limiter(req); // T=10s

      jest.advanceTimersByTime(5000);
      const result = limiter(req); // T=15s (Blocked)

      /**
       * Expected: 45s
       * Logic: Oldest request at 0s + 60s window = expires at 60s.
       * Current time is 15s. 60 - 15 = 45.
       */
      expect(result.success).toBe(false);
      expect(result.error!.retryAfter).toBe(45);
    });
  });

  describe('keyGenerator', () => {
    it('should use different limits for different IPs', () => {
      const limiter = rateLimit({ max: 1 });
      const req1 = mockRequest('1.1.1.1');
      const req2 = mockRequest('2.2.2.2');

      expect(limiter(req1).success).toBe(true);
      expect(limiter(req1).success).toBe(false);

      expect(limiter(req2).success).toBe(true);
      expect(limiter(req2).success).toBe(false);
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const limiter = rateLimit({ max: 1 });
      const req = mockRequest('9.9.9.9', { 'x-forwarded-for': '1.2.3.4' });

      expect(limiter(req).success).toBe(true);

      // Ensure it tracks the forwarded IP even if the source IP changes
      const req2 = mockRequest('8.8.8.8', { 'x-forwarded-for': '1.2.3.4' });
      expect(limiter(req2).success).toBe(false);
    });

    it('should handle x-forwarded-for with multiple IPs (first-trust logic)', () => {
      const limiter = rateLimit({ max: 1 });
      const req = mockRequest('9.9.9.9', {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      });
      expect(limiter(req).success).toBe(true);

      const req2 = mockRequest('8.8.8.8', {
        'x-forwarded-for': '1.2.3.4, 1.1.1.1',
      });
      expect(limiter(req2).success).toBe(false);
    });

    it('should use a custom keyGenerator', () => {
      const limiter = rateLimit({
        max: 1,
        keyGenerator: (req: RequestTypeMock) => req.headers.get('authorization')!,
      });

      const req1 = mockRequest('1.1.1.1', { authorization: 'token-A' });
      const req2 = mockRequest('1.1.1.1', { authorization: 'token-B' });

      expect(limiter(req1).success).toBe(true);
      expect(limiter(req1).success).toBe(false);

      expect(limiter(req2).success).toBe(true);
    });
  });

  describe('Pre-configured Limiters', () => {
    it('authRateLimit should have max 5 and specific error message', () => {
      const req = mockRequest('1.1.1.1');
      for (let i = 0; i < 5; i++) {
        expect(authRateLimit(req).success).toBe(true);
      }
      const result = authRateLimit(req);
      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('authentication attempts');
    });

    it('apiRateLimit should have max 100', () => {
      const req = mockRequest('1.1.1.1');
      for (let i = 0; i < 100; i++) {
        expect(apiRateLimit(req).success).toBe(true);
      }
      const result = apiRateLimit(req);
      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('API requests');
    });
  });
});
