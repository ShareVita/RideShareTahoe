import { createClient } from '@/libs/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface UserWithEmail {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

/**
 * Get the application URL for server-side operations.
 * For internal API calls, always use the production URL to avoid
 * issues with Vercel preview deployment URLs.
 */
export function getAppUrl(): string {
  // Always use production URL for internal API calls
  // This ensures email routes are called on the correct domain
  return process.env.APP_URL || 'https://www.ridesharetahoe.com';
}

/**
 * Sanitize a string for safe logging (prevents log injection attacks).
 */
export function sanitizeForLog(value: string | undefined | null): string {
  if (!value) return '';
  return String(value).replace(/[\r\n\t]/g, '');
}

/**
 * Fetch a user's profile data along with their email from user_private_info.
 * Uses parallel queries for efficiency.
 */
export async function getUserWithEmail(
  supabase: SupabaseClient,
  userId: string
): Promise<UserWithEmail | null> {
  const [profileResult, privateInfoResult] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name').eq('id', userId).single(),
    supabase.from('user_private_info').select('email').eq('id', userId).single(),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  if (privateInfoResult.error || !privateInfoResult.data?.email) {
    return null;
  }

  return {
    id: profileResult.data.id,
    first_name: profileResult.data.first_name,
    last_name: profileResult.data.last_name,
    email: privateInfoResult.data.email,
  };
}
