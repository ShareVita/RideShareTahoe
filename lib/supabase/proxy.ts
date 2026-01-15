import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
 * - If no user claims are present and the request path is not under
 *   `/login` or `/auth`, the request is redirected to `/login`.
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

  if (
    !user &&
    request.nextUrl.pathname !== '/' &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Return the response that preserves any cookies set by Supabase.
  return supabaseResponse;
}
