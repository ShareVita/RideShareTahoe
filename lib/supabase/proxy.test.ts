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
