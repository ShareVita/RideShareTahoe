import { jest } from '@jest/globals';
import type { NextRequest } from 'next/server';

type CookieOptions = Record<string, unknown>;

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

interface NextUrlLike {
  pathname: string;
  clone: () => NextUrlLike;
}

interface RequestLike {
  cookies: {
    getAll: () => CookieToSet[];
    // eslint-disable-next-line no-unused-vars
    set: (name: string, value: string) => void;
  };
  nextUrl: NextUrlLike;
}

describe('updateSession', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns NextResponse.next when a user is present', async () => {
    const responseCookiesSet = jest.fn();
    const mockNextResponse = { cookies: { set: responseCookiesSet } };

    const NextResponseMock = {
      next: jest.fn().mockReturnValue(mockNextResponse),
      redirect: jest.fn(),
    };

    const mockGetClaims = jest.fn(async () => ({
      data: { claims: { sub: 'user-1' } },
    })) as unknown as () => Promise<{ data?: { claims?: { sub: string } } | undefined }>;
    const createServerClientMock = jest
      .fn()
      .mockImplementation(() => ({ auth: { getClaims: mockGetClaims } }));

    jest.doMock('next/server', () => ({ NextResponse: NextResponseMock }));
    jest.doMock('@supabase/ssr', () => ({ createServerClient: createServerClientMock }));

    const { updateSession } = await import('./proxy');

    const request: RequestLike = {
      cookies: { getAll: () => [], set: jest.fn() },
      nextUrl: {
        pathname: '/rides',
        clone: function () {
          return { pathname: this.pathname, clone: this.clone };
        },
      },
    };

    const res = await updateSession(request as unknown as NextRequest);

    expect(NextResponseMock.next).toHaveBeenCalledWith({ request });
    expect(res).toBe(mockNextResponse);
  });

  it('redirects to /login when no user and path is protected', async () => {
    const mockRedirectResponse = {};
    const NextResponseMock = {
      next: jest.fn().mockReturnValue({ cookies: { set: jest.fn() } }),
      redirect: jest.fn().mockReturnValue(mockRedirectResponse),
    };

    const mockGetClaims = jest.fn(async () => ({ data: undefined })) as unknown as () => Promise<{
      data?: { claims?: { sub: string } } | undefined;
    }>;
    const createServerClientMock = jest
      .fn()
      .mockImplementation(() => ({ auth: { getClaims: mockGetClaims } }));

    jest.doMock('next/server', () => ({ NextResponse: NextResponseMock }));
    jest.doMock('@supabase/ssr', () => ({ createServerClient: createServerClientMock }));

    const { updateSession } = await import('./proxy');

    const request: RequestLike = {
      cookies: { getAll: () => [], set: jest.fn() },
      nextUrl: {
        pathname: '/rides/create',
        clone: function () {
          return { pathname: this.pathname, clone: this.clone };
        },
      },
    };

    const res = await updateSession(request as unknown as NextRequest);

    expect(NextResponseMock.redirect).toHaveBeenCalled();
    const calledUrl = (NextResponseMock.redirect as jest.Mock).mock.calls[0][0] as unknown;
    const pathname =
      typeof calledUrl === 'string' ? calledUrl : (calledUrl as { pathname?: string }).pathname;
    expect(String(pathname)).toMatch('/login');
    expect(res).toBe(mockRedirectResponse);
  });

  it('does not redirect when path is root or under /login or /auth', async () => {
    const NextResponseMock = {
      next: jest.fn().mockReturnValue({ cookies: { set: jest.fn() } }),
      redirect: jest.fn(),
    };

    const mockGetClaims = jest.fn(async () => ({ data: undefined })) as unknown as () => Promise<{
      data?: { claims?: { sub: string } } | undefined;
    }>;
    const createServerClientMock = jest
      .fn()
      .mockImplementation(() => ({ auth: { getClaims: mockGetClaims } }));

    jest.doMock('next/server', () => ({ NextResponse: NextResponseMock }));
    jest.doMock('@supabase/ssr', () => ({ createServerClient: createServerClientMock }));

    const { updateSession } = await import('./proxy');

    const makeReq = (p: string): RequestLike => ({
      cookies: { getAll: () => [], set: jest.fn() },
      nextUrl: {
        pathname: p,
        clone: function () {
          return { pathname: this.pathname, clone: this.clone };
        },
      },
    });

    const r1 = await updateSession(makeReq('/') as unknown as NextRequest);
    const r2 = await updateSession(makeReq('/login') as unknown as NextRequest);
    const r3 = await updateSession(makeReq('/auth/callback') as unknown as NextRequest);

    expect(NextResponseMock.redirect).not.toHaveBeenCalled();
    expect(NextResponseMock.next).toHaveBeenCalledTimes(3);
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(r3).toBeDefined();
  });

  it('mirrors cookies from supabase into request and response when setAll is called', async () => {
    const responseCookiesSet = jest.fn();
    const mockNextResponse = { cookies: { set: responseCookiesSet } };
    const NextResponseMock = {
      next: jest.fn().mockReturnValue(mockNextResponse),
      redirect: jest.fn(),
    };

    const createServerClientMock = jest.fn().mockImplementation((...args: unknown[]) => {
      // eslint-disable-next-line no-unused-vars
      const opts = args[2] as unknown as { cookies: { setAll: (c: CookieToSet[]) => void } };
      const cookiesToSet: CookieToSet[] = [{ name: 'sup', value: 'val', options: { path: '/' } }];
      opts.cookies.setAll(cookiesToSet);
      return { auth: { getClaims: async () => ({ data: { claims: { sub: 'u' } } }) } };
    });

    jest.doMock('next/server', () => ({ NextResponse: NextResponseMock }));
    jest.doMock('@supabase/ssr', () => ({ createServerClient: createServerClientMock }));

    const { updateSession } = await import('./proxy');

    const requestCookiesSet = jest.fn();
    const request: RequestLike = {
      cookies: { getAll: () => [], set: requestCookiesSet },
      nextUrl: {
        pathname: '/rides',
        clone: function () {
          return { pathname: this.pathname, clone: this.clone };
        },
      },
    };

    const res = await updateSession(request as unknown as NextRequest);

    expect(requestCookiesSet).toHaveBeenCalledWith('sup', 'val');
    expect(responseCookiesSet).toHaveBeenCalledWith('sup', 'val', { path: '/' });
    expect(res).toBe(mockNextResponse);
  });
});

describe('isPublicPath', () => {
  // Pure predicate: no Supabase or next/server mocks needed, but the module is
  // still imported dynamically to match this file's resetModules style.
  const load = async () => (await import('./proxy')).isPublicPath;

  beforeEach(() => {
    jest.resetModules();
  });

  // Content-only pages. An anonymous visitor and a crawler must be able to read
  // every one of these; all of them used to 307 to /login.
  it('allows the public content pages', async () => {
    const isPublicPath = await load();
    for (const path of [
      '/',
      '/our-story',
      '/faq',
      '/safety',
      '/community-guidelines',
      '/how-to-use',
      '/tahoe-transportation',
      '/rides/find',
      '/privacy-policy',
      '/tos',
    ]) {
      expect([path, isPublicPath(path)]).toEqual([path, true]);
    }
  });

  // Deny-by-default is the point: anything reading member data stays gated, and
  // a route nobody listed is private until someone deliberately opens it.
  it('gates everything that reads member data', async () => {
    const isPublicPath = await load();
    for (const path of [
      '/community',
      '/profile',
      '/profile/123',
      '/profile/edit',
      '/messages',
      '/rides',
      '/rides/post',
      '/rides/edit/123',
      '/vehicles',
      '/admin',
      '/admin/bulk-email',
      '/complete-profile',
      '/onboarding/welcome',
      '/some-route-added-later',
    ]) {
      expect([path, isPublicPath(path)]).toEqual([path, false]);
    }
  });

  it('keeps auth and crawler paths reachable', async () => {
    const isPublicPath = await load();
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/auth/callback')).toBe(true);
    expect(isPublicPath('/api/auth/confirm')).toBe(true);
    expect(isPublicPath('/robots.txt')).toBe(true);
    expect(isPublicPath('/sitemap.xml')).toBe(true);
  });

  // A stray trailing slash must not bounce a public page to /login.
  it('ignores a trailing slash', async () => {
    const isPublicPath = await load();
    expect(isPublicPath('/faq/')).toBe(true);
    expect(isPublicPath('/community/')).toBe(false);
  });

  // Making "/rides/find" public must not open the whole /rides tree.
  it('does not leak a public leaf into its parent tree', async () => {
    const isPublicPath = await load();
    expect(isPublicPath('/rides/find')).toBe(true);
    expect(isPublicPath('/rides/find/anything')).toBe(false);
    expect(isPublicPath('/rides')).toBe(false);
  });
});
