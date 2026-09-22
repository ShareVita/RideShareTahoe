import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Routes an anonymous visitor may read.
 *
 * These are the public, content-only pages: marketing, policy and help. Every
 * one of them was previously redirected to /login, which meant Google could
 * index exactly one page of this site (`/`) and the carpool product was
 * invisible in search. It also put the privacy policy and terms of service
 * behind a login, which they are not supposed to be.
 *
 * This is an allowlist, not a denylist: anything not named here stays gated, so
 * a new route is private until someone deliberately makes it public. Pages that
 * read member data (/community, /profile, /messages, /rides/post, /vehicles,
 * /admin, ...) are deliberately absent and must stay that way.
 */
const PUBLIC_PATHS = new Set([
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
]);

/** Path prefixes that must stay reachable for auth itself to work. */
const AUTH_PREFIXES = ['/login', '/auth', '/api/auth'];

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
 * - If no user claims are present and the request path is not public (see
 *   `isPublicPath`), the request is redirected to `/login`.
 *
 * @param request - The incoming Next.js `NextRequest` to inspect and modify.
 * @returns A `NextResponse` that preserves Supabase cookies and may redirect
 * to `/login` when there is no authenticated session.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Return the response that preserves any cookies set by Supabase.
  return supabaseResponse;
}
