import { createClient, createAdminClient, _resetAdminClient } from './server';

type CookieHelpers = {
  getAll?: () => Array<{ name: string; value: string }>;
  setAll?: unknown;
  set?: unknown;
};

const mockCreateServerClient = jest.fn();
const mockCreateSupabaseClient = jest.fn();
const mockCookiesFactory = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateSupabaseClient(...args),
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

  test('uses publishable key', async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    };

    const cookieStore = {
      getAll: jest.fn(() => []),
      set: jest.fn(),
    };

    mockCookiesFactory.mockImplementation(() => cookieStore);
    mockCreateServerClient.mockImplementation(() => ({ client: true }));

    await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'publishable-key',
      expect.any(Object)
    );

    process.env = originalEnv;
  });
});

describe('createAdminClient', () => {
  beforeEach(() => {
    mockCreateSupabaseClient.mockReset();
    _resetAdminClient(); // Reset singleton between tests
  });

  test('uses service role key', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    };

    mockCreateSupabaseClient.mockImplementation(() => ({ adminClient: true }));

    const client = createAdminClient();

    expect(client).toEqual({ adminClient: true });
    expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'service-role-key',
      expect.objectContaining({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    );

    process.env = originalEnv;
  });

  test('does not use cookies', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    };

    mockCreateSupabaseClient.mockImplementation((...args: unknown[]) => {
      const opts = args[2] as { cookies?: unknown } | undefined;
      // Verify that cookies are NOT passed to the admin client
      expect(opts?.cookies).toBeUndefined();
      return { adminClient: true };
    });

    createAdminClient();

    expect(mockCreateSupabaseClient).toHaveBeenCalled();

    process.env = originalEnv;
  });

  test('disables session persistence', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    };

    mockCreateSupabaseClient.mockImplementation((...args: unknown[]) => {
      const opts = args[2] as
        | { auth?: { persistSession?: boolean; autoRefreshToken?: boolean } }
        | undefined;
      // Verify that session persistence is disabled
      expect(opts?.auth?.persistSession).toBe(false);
      expect(opts?.auth?.autoRefreshToken).toBe(false);
      return { adminClient: true };
    });

    createAdminClient();

    expect(mockCreateSupabaseClient).toHaveBeenCalled();

    process.env = originalEnv;
  });
});
