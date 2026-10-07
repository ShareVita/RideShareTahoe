import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

/**
 * Create a Supabase browser client using publishable environment variables.
 *
 * This helper wraps `createBrowserClient` so callers don't need to repeatedly
 * pass the environment variables where the client is used in the browser.
 *
 * @returns A Supabase client instance created with `createBrowserClient`.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
