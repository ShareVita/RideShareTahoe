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
 * Next.js middleware config: exclude static assets, images, and the favicon
 * from middleware handling via the `matcher` pattern.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
