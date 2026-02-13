import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Create a Supabase server client wired to the current request's cookie
 * store. This helper is intended for use in Next.js server components and
 * API routes where server-side cookie access is required.
 *
 * Use this for user-authenticated operations where you need access to the
 * current user's session via cookies.
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

/**
 * Singleton Supabase admin client with service role privileges.
 * Created once and reused across all operations for efficiency.
 */
let _adminClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Reset the admin client singleton. Only used for testing.
 * @internal
 */
export function _resetAdminClient() {
  _adminClient = null;
}

/**
 * Get the singleton Supabase admin client with service role privileges.
 * This client bypasses Row Level Security (RLS) policies and should only
 * be used for trusted server-side operations.
 *
 * The client is created once on first access and reused for all subsequent
 * calls, eliminating unnecessary client instantiation overhead.
 *
 * Use this for:
 * - Accessing user_private_info table
 * - Administrative operations that need to bypass RLS
 * - Internal email sending operations
 *
 * IMPORTANT: Never use this client with user-provided input without
 * proper validation. The service role key grants full database access.
 *
 * @returns A Supabase client with admin privileges (no cookie authentication)
 */
export function createAdminClient() {
  if (!_adminClient) {
    _adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return _adminClient;
}
