import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.mock('next/server', () => {
  class MockNextResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init?.status ?? 200;
    }

    async json() {
      return this.body;
    }
  }

  const NextResponse = {
    json: (body, init) => new MockNextResponse(body, init),
  };

  class NextRequest {
    constructor(input = '', init = {}) {
      this.input = input;
      this.init = init;
      this.url = typeof input === 'string' ? input : (input?.url ?? '');
      this.method = init.method ?? 'GET';
      this.headersMap = new Map();

      const headers = init.headers || {};
      Object.entries(headers).forEach(([key, value]) => {
        this.headersMap.set(key.toLowerCase(), String(value));
      });

      this.headers = {
        get: (key) => this.headersMap.get(key.toLowerCase()) ?? null,
        has: (key) => this.headersMap.has(key.toLowerCase()),
      };
    }

    getHeaders() {
      const headers = {};
      this.headersMap.forEach((value, key) => {
        headers[key] = value;
      });
      return headers;
    }

    async json() {
      if (!this.init?.body) return null;
      if (typeof this.init.body === 'string') {
        return JSON.parse(this.init.body);
      }
      if (Buffer.isBuffer(this.init.body)) {
        return JSON.parse(this.init.body.toString());
      }
      return this.init.body;
    }
  }

  return {
    NextRequest,
    NextResponse,
  };
});

if (!('Request' in globalThis)) {
  function TestRequest(...args) {
    this.args = args;
  }
  globalThis.Request = TestRequest;
}

if (!('Response' in globalThis)) {
  function TestResponse(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
  }
  TestResponse.json = (content, init) => new TestResponse(content, init);
  globalThis.Response = TestResponse;
}

// Mock the Next.js Image component
// This prevents errors related to image source validation in the JSDOM environment.
globalThis.console = {
  ...console,
  // console.log, console.warn, and console.error are mocked to be silent
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height = 'intrinsic', ...rest }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} {...rest} />;
  },
}));

if (globalThis.window != undefined) {
  globalThis.globalThis.scrollTo = jest.fn();
}

if (process.env.RUN_INTEGRATION_TESTS === 'true') {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing integration test env vars: ${missingEnvVars.join(
        ', '
      )}. Add them to GitHub Actions Secrets or your .env.test.local file.`
    );
  }
}

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'DUMMY_RESEND_KEY';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'DUMMY_SUPABASE_URL';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'DUMMY_SERVICE_KEY';
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy-publishable-key';

globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

if (process.env.RUN_INTEGRATION_TESTS === 'true') {
  // Integration tests hit Supabase and may take longer than the default 5s per test.
  jest.setTimeout(30_000);
}
