import { updateSession } from '@/lib/supabase/proxy';
import { type NextRequest } from 'next/server';

/**
 * Middleware entry point that ensures the user's Supabase session is
 * synchronized for the incoming request. Delegates to `updateSession` which
 * returns a `NextResponse` that preserves Supabase cookies.
 *
 * @param request - The incoming Next.js `NextRequest` object.
 * @returns The `NextResponse` produced by `updateSession`.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Next.js middleware config: exclude static assets, images, the favicon and
 * the crawler-facing metadata routes from middleware handling via the
 * `matcher` pattern.
 *
 * `robots.txt` and `sitemap.xml` must be excluded: the session gate redirects
 * unauthenticated requests to /login, so without this crawlers were served the
 * login page's HTML in place of either file.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|twitter-image|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
