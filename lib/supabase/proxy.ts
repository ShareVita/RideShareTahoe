import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/authRedirect';

/**
 * Routes an anonymous visitor may read.
 *
 * These are the public, content-only pages: marketing, policy and help. Every
 * one of them was previously redirected to /login, which meant Google could
 * index exactly one page of this site (`/`) and the carpool product was
 * invisible in search. It also put the privacy policy and terms of service
 * behind a login, which they are not supposed to be.
 *
 * Pages reading member data are gated separately below. API handlers own their
 * authorization (including Bearer tokens), and unknown URLs must reach 404.
 */
const PUBLIC_PATHS = new Set([
  '/',
  '/our-story',
  '/faq',
  '/safety',
  '/community-guidelines',
  '/how-to-use',
  '/tahoe-transportation',
  '/tahoe-resorts',
  '/rides',
  '/rides/find',
  '/privacy-policy',
  '/tos',
  '/unsubscribe',
]);

/** Path prefixes that must stay reachable for auth itself to work. */
const AUTH_PREFIXES = ['/login', '/auth', '/api/auth', '/api/email/unsubscribe'];

/** Crawler-facing files that must never redirect. */
const CRAWLER_PATHS = new Set(['/robots.txt', '/sitemap.xml', '/manifest.webmanifest']);

/**
 * Whether an anonymous request for this path is allowed through.
 *
 * Trailing slashes are normalised so that `/faq/` and `/faq` behave the same;
 * otherwise a stray slash would silently bounce a public page to /login.
 */
export function isPublicPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PUBLIC_PATHS.has(path) || CRAWLER_PATHS.has(path)) return true;
  return AUTH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Match existing private pages, not arbitrary paths under their prefixes. */
export function isPrivatePage(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '');
  return /^(?:\/community|\/vehicles|\/messages|\/complete-profile|\/onboarding\/welcome|\/admin(?:\/bulk-email)?|\/profile(?:\/[^/]+)?|\/rides(?:\/post|\/edit\/[^/]+))$/.test(
    path
  );
}

/**
 * Ensure the Supabase session for the incoming request is loaded and
 * synchronized with the response cookies. This function creates a new
 * Supabase server client (do not reuse a global client), fetches session
 * claims, and returns a `NextResponse` that preserves any cookies set by
 * the Supabase client.
 *
 * Behavior notes:
 * - A new server client is created per request and wired to the request's
 *   cookies so cookie updates are propagated back to the response.
 * - Callers should not execute code between client creation and
 *   `supabase.auth.getClaims()`; doing so can cause hard-to-debug session
 *   issues.
 * - API handlers own authorization; unknown URLs reach the router's 404.
 * - Anonymous requests for known private pages are redirected to `/login`.
 *
 * @param request - The incoming Next.js `NextRequest` to inspect and modify.
 * @returns A `NextResponse` that preserves Supabase cookies and may redirect
 * to `/login` when there is no authenticated session.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Do not turn API 401/403/404 responses into HTML redirects, or require a
  // cookie session for scheduler and Bearer-token authentication.
  if (request.nextUrl.pathname === '/api' || request.nextUrl.pathname.startsWith('/api/')) {
    return supabaseResponse;
  }

  // Create a per-request Supabase server client using the request cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror cookie updates into both the incoming request object
          // and the outgoing response so client and server stay in sync.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Fetch claims to ensure session state is loaded on the server.
  const { data, error } = await supabase.auth.getClaims();
  const user = !error && data?.claims?.sub;

  if (!user && !isPublicPath(request.nextUrl.pathname) && isPrivatePage(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    const next = safeNextPath(request.nextUrl.pathname + request.nextUrl.search);
    url.pathname = '/login';
    url.search = '';
    if (next) url.searchParams.set('next', next);
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  // Return the response that preserves any cookies set by Supabase.
  return supabaseResponse;
}
