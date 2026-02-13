import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type SupabaseKeyType = 'PUBLISHABLE' | 'service_role';

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
 * @param type - Specifies which key to use: 'PUBLISHABLE' (default) for client operations,
 *               or 'service_role' for backend administrative tasks that bypass RLS.
 * @returns A Supabase server client instance configured to read and write
 * cookies from the Next.js cookie store.
 */
export async function createClient(type: SupabaseKeyType = 'PUBLISHABLE') {
  const cookieStore = await cookies();

  // Determine which key to use based on the 'type' argument
  const supabaseKey =
    type === 'service_role'
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Ignore failures when called from a Server Component; middleware
          // should handle session refresh in that case.
        }
      },
    },
  });
}
