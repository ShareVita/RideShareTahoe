import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase server client wired to the current request's cookie
 * store. This helper is intended for use in Next.js server components and
 * API routes where server-side cookie access is required.
 *
 * Notes:
 * - A per-request client is created to avoid reusing global clients in
 *   server environments.
 * - If `setAll` is invoked from a Server Component, `cookieStore.set` may
 *   throw; that case is intentionally ignored because session refreshes are
 *   typically handled in middleware.
 *
 * @returns A Supabase server client instance configured to read and write
 * cookies from the Next.js cookie store.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore failures when called from a Server Component; middleware
            // should handle session refresh in that case.
          }
        },
      },
    }
  );
}
