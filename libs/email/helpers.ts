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
 * Uses APP_URL, then VERCEL_URL, then falls back to production URL.
 */
export function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://ridesharetahoe.com';
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
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_private_info')
      .select('email')
      .eq('id', userId)
      .single(),
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

/**
 * Fetch multiple users with their emails efficiently using a single query with JOIN.
 * Returns users that have valid email addresses.
 */
export async function getUsersWithEmails(
  supabase: SupabaseClient,
  options?: { excludeBanned?: boolean }
): Promise<UserWithEmail[]> {
  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name, user_private_info(email)');

  if (options?.excludeBanned) {
    query = query.eq('is_banned', false);
  }

  const { data: users, error } = await query;

  if (error || !users) {
    return [];
  }

  // Filter and transform to get users with valid emails
  return users
    .map((user) => {
      // Handle Supabase's JOIN response format (can be array or object)
      const privateInfo = Array.isArray(user.user_private_info)
        ? user.user_private_info[0]
        : user.user_private_info;

      const email = privateInfo?.email;
      if (!email) return null;

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email,
      };
    })
    .filter((user): user is UserWithEmail => user !== null);
}

/**
 * Get email address for a user by their ID.
 * Returns null if user not found or has no email.
 */
export async function getUserEmail(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('user_private_info')
    .select('email')
    .eq('id', userId)
    .single();

  return data?.email || null;
}
