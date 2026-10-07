import { createAdminClient } from '@/lib/supabase/server';

type AdminClient = ReturnType<typeof createAdminClient>;

export interface UserWithEmail {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

/**
 * Cached application URL. Computed once on module load for efficiency.
 */
const APP_URL = process.env.APP_URL || 'https://www.ridesharetahoe.com';

/**
 * Get the application URL for server-side operations.
 * For internal API calls, always use the production URL to avoid
 * issues with Vercel preview deployment URLs.
 *
 * This function returns a cached constant for optimal performance.
 */
export function getAppUrl(): string {
  return APP_URL;
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
 *
 * @param supabase - Admin client with service role access to read user_private_info
 * @param userId - The user's UUID
 * @returns User data with email, or null if not found
 */
export async function getUserWithEmail(
  supabase: AdminClient,
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

/** PostgREST returns at most this many rows per request (Supabase default). */
const PAGE_SIZE = 1000;
/** Keep `id=in.(...)` filters well under URL length limits. */
const ID_CHUNK_SIZE = 100;

/**
 * Emails keyed by user id.
 *
 * `user_private_info` and `profiles` both reference `auth.users` but not each
 * other, so PostgREST cannot embed one in the other (it answers PGRST200).
 * Read the private rows separately and join in code.
 */
export async function getEmailsByUserId(
  supabase: AdminClient,
  userIds: readonly string[]
): Promise<Map<string, string>> {
  const chunks: string[][] = [];
  for (let start = 0; start < userIds.length; start += ID_CHUNK_SIZE) {
    chunks.push(userIds.slice(start, start + ID_CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map((ids) => supabase.from('user_private_info').select('id, email').in('id', ids))
  );

  const emails = new Map<string, string>();
  for (const { data, error } of results) {
    if (error) throw error;
    for (const row of data ?? []) {
      const email = row.email?.trim();
      if (email) emails.set(row.id, email);
    }
  }
  return emails;
}

/**
 * Every user who has an email address, read in pages so the whole member list
 * is returned (a single request stops at 1000 rows).
 */
export async function getUsersWithEmails(
  supabase: AdminClient,
  options?: { excludeBanned?: boolean }
): Promise<UserWithEmail[]> {
  const profiles: Array<Pick<UserWithEmail, 'id' | 'first_name' | 'last_name'>> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from('profiles').select('id, first_name, last_name');
    if (options?.excludeBanned) {
      query = query.eq('is_banned', false);
    }
    const { data, error } = await query.order('id').range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    profiles.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const emails = await getEmailsByUserId(
    supabase,
    profiles.map((profile) => profile.id)
  );

  return profiles.flatMap((profile) => {
    const email = emails.get(profile.id);
    return email ? [{ ...profile, email }] : [];
  });
}

/**
 * Get email address for a user by their ID.
 * Returns null if user not found or has no email.
 */
export async function getUserEmail(supabase: AdminClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_private_info')
    .select('email')
    .eq('id', userId)
    .single();

  return data?.email || null;
}
