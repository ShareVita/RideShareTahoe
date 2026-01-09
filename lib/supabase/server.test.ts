import { createClient } from './server';

type CookieHelpers = {
  getAll?: () => Array<{ name: string; value: string }>;
  setAll?: unknown;
  set?: unknown;
};

const mockCreateServerClient = jest.fn();
const mockCookiesFactory = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('next/headers', () => ({
  cookies: () => mockCookiesFactory(),
}));

describe('createClient', () => {
  beforeEach(() => {
    mockCreateServerClient.mockReset();
    mockCookiesFactory.mockReset();
  });

  test('passes cookie helpers to createServerClient and exposes getAll', async () => {
    const cookieStore = {
      getAll: jest.fn(() => [{ name: 'a', value: '1' }]),
      set: jest.fn(),
    };

    mockCookiesFactory.mockImplementation(() => cookieStore);

    let capturedCookies: CookieHelpers | null = null;

    mockCreateServerClient.mockImplementation((...args: unknown[]) => {
      const opts = args[2] as { cookies?: CookieHelpers } | undefined;
      capturedCookies = opts?.cookies ?? null;
      return { client: true };
    });

    const client = await createClient();

    expect(client).toEqual({ client: true });
    expect(mockCreateServerClient).toHaveBeenCalled();
    // the getAll returned should call through to the cookie store
    expect(capturedCookies).not.toBeNull();
    const all = (
      capturedCookies as unknown as { getAll: () => Array<{ name: string; value: string }> }
    ).getAll();
    expect(all).toEqual([{ name: 'a', value: '1' }]);
    expect(cookieStore.getAll).toHaveBeenCalled();
  });

  test('setAll swallows errors from cookie store.set', async () => {
    const cookieStore = {
      getAll: jest.fn(() => []),
      set: jest.fn(() => {
        throw new Error('boom');
      }),
    };

    mockCookiesFactory.mockImplementation(() => cookieStore);

    let capturedCookies2: CookieHelpers | null = null;
    mockCreateServerClient.mockImplementation((...args: unknown[]) => {
      const opts = args[2] as { cookies?: CookieHelpers } | undefined;
      capturedCookies2 = opts?.cookies ?? null;
      return { client: true };
    });

    await createClient();

    // calling setAll should not throw even if cookieStore.set throws
    expect(capturedCookies2).not.toBeNull();
    const maybeSetAll = (capturedCookies2 as unknown as { setAll?: unknown })?.setAll;
    expect(() => {
      if (typeof maybeSetAll === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (maybeSetAll as any)([{ name: 'x', value: 'y', options: {} }]);
      }
    }).not.toThrow();
    expect(cookieStore.set).toHaveBeenCalled();
  });
});
