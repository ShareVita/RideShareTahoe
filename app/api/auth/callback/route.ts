import { type NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { SupabaseClient, type UserMetadata } from '@supabase/supabase-js';
import { getAppUrl, sanitizeForLog } from '@/libs/email/helpers';

// Define types locally for safety (mirroring database schema)
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  role: string | null;
  display_lat: number | null;
  display_lng: number | null;
  // Social fields
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  airbnb_url?: string | null;
  other_social_url?: string | null;
}

/**
 * Evaluates user state to determine the appropriate post-authentication destination.
 * * @param profile - The public profile record from the database.
 * @param isNewUser - Boolean indicating if the user has no record of a welcome email.
 * @param hasSocial - Boolean indicating if the user has added at least one social link.
 * @returns A relative URL path.
 */
export function determineRedirectStrategy(
  profile: Profile,
  isNewUser: boolean,
  hasSocial: boolean
): string {
  if (isNewUser) return '/profile/edit';

  const hasRole = !!profile.role?.trim();
  const hasLocation = profile.display_lat !== null && profile.display_lng !== null;
  const isComplete = hasRole && hasSocial && hasLocation;

  return isComplete ? '/community' : '/profile/edit';
}

/**
 * Resolves the final profile data by merging OAuth provider metadata with existing records.
 * OAuth metadata is treated as the primary source for name and photo updates during login.
 * * @param userId - Unique identifier for the user.
 * @param metadata - Metadata provided by the OAuth identity provider.
 * @param existing - Current profile data if it exists.
 */
export function prepareProfileUpsert(
  userId: string,
  metadata: UserMetadata,
  existing?: Partial<Profile> | null
): Partial<Profile> & { id: string } {
  return {
    id: userId,
    first_name: metadata.given_name || metadata.first_name || existing?.first_name || null,
    last_name: metadata.family_name || metadata.last_name || existing?.last_name || null,
    profile_photo_url:
      metadata.picture || metadata.avatar_url || existing?.profile_photo_url || null,
  };
}

/**
 * Aggregates user data from multiple tables to build the context for routing and synchronization.
 */
async function getAuthProcessingContext(supabase: SupabaseClient, userId: string) {
  const [profileRes, welcomeRecordRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('email_events')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'welcome')
      .maybeSingle(),
  ]);

  const profile = profileRes.data as Profile | null;

  // Check if any social link is present locally since we fetched the full profile
  const hasSocial = !!(
    profile?.facebook_url?.trim() ||
    profile?.instagram_url?.trim() ||
    profile?.linkedin_url?.trim() ||
    profile?.airbnb_url?.trim() ||
    profile?.other_social_url?.trim()
  );

  return {
    existingProfile: profile,
    hasSocial,
    isNewUser: !welcomeRecordRes.data,
  };
}

/**
 * Executes post-login operations that do not impact the immediate redirection of the user.
 * Handles sensitive data synchronization via service_role and triggers transactional emails.
 */
async function executeBackgroundTasks(
  userId: string,
  email: string | undefined,
  isNewUser: boolean
) {
  try {
    const supabaseAdmin = await createClient('service_role');

    if (email) {
      await supabaseAdmin
        .from('user_private_info')
        .upsert({ id: userId, email }, { onConflict: 'id' });
    }

    if (isNewUser) {
      const appUrl = getAppUrl();
      await fetch(`${appUrl}/api/emails/send-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
        },
        body: JSON.stringify({ userId }),
      });
      console.log(`✅ [Background] Success for ${sanitizeForLog(userId)}`);
    }
  } catch (err) {
    console.error('❌ [Background] Task failure:', err);
  }
}

async function processCodeExchangeAndProfileUpdate(
  requestUrl: URL,
  code: string
): Promise<NextResponse> {
  const supabase = await createClient();
  const origin = requestUrl.origin;

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !data.user) {
    console.error('Exchange failed:', exchangeError);
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
  }

  const user = data.user;
  const context = await getAuthProcessingContext(supabase, user.id);
  const upsertData = prepareProfileUpsert(user.id, user.user_metadata, context.existingProfile);

  const { data: updatedProfile, error: profileError } = await supabase
    .from('profiles')
    .upsert(upsertData)
    .select()
    .single();

  if (profileError || !updatedProfile) {
    return NextResponse.redirect(new URL('/login?error=sync_failed', origin));
  }

  after(() => executeBackgroundTasks(user.id, user.email, context.isNewUser));

  const path = determineRedirectStrategy(updatedProfile, context.isNewUser, context.hasSocial);
  const redirectUrl = new URL(path, origin);
  redirectUrl.searchParams.set('_t', Date.now().toString());

  return NextResponse.redirect(redirectUrl);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin));
  }

  try {
    return await processCodeExchangeAndProfileUpdate(requestUrl, code);
  } catch (err) {
    console.error('Unexpected Auth Error:', err);
    return NextResponse.redirect(new URL('/login?error=unexpected', requestUrl.origin));
  }
}
