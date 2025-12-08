import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { type Session, type User, type UserMetadata } from '@supabase/supabase-js';

// Define types locally for safety (mirroring database schema)
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  role: string | null;
  phone_number: string | null;
  display_lat: number | null;
  display_lng: number | null;
}

/**
 * Determines the final destination URL based on user status and profile completeness.
 * Appends a cache-busting parameter to ensure client-side session freshness.
 */
function determineRedirectPath(
  finalRedirectBaseUrl: string,
  profile: Profile,
  isNewUser: boolean,
  hasPhonePrivate: boolean
): string {
  const cacheBust: string = `_t=${Date.now()}`;

  // NEW USERS → Always go to profile edit
  if (isNewUser) {
    console.log('🆕 NEW USER → Redirecting to /profile/edit');
    return `${finalRedirectBaseUrl}/profile/edit?${cacheBust}`;
  }

  // Check profile completeness for existing users
  // Treat bio as optional; require role, phone, and a verified location
  const hasRole: boolean = !!profile.role && profile.role.trim().length > 0;
  const hasLocation: boolean = profile.display_lat !== null && profile.display_lng !== null;

  console.log('📊 Profile completeness check:');
  console.log('   ✓ Role:', hasRole ? '✅ Complete' : '❌ Missing');
  console.log('   ✓ Phone:', hasPhonePrivate ? '✅ Complete' : '❌ Missing');
  console.log(
    '   ✓ Location:',
    hasLocation ? '✅ Verified (display_lat/lng present)' : '❌ Missing'
  );

  // Existing user logic
  if (hasRole && hasPhonePrivate && hasLocation) {
    console.log('✅ PROFILE COMPLETE → Redirecting to /community');
    return `${finalRedirectBaseUrl}/community?${cacheBust}`;
  } else {
    console.log('📝 PROFILE INCOMPLETE → Redirecting to /profile/edit');
    return `${finalRedirectBaseUrl}/profile/edit?${cacheBust}`;
  }
}

/**
 * Executes the core OAuth logic: code exchange, profile synchronization, emails, and final routing.
 */
async function processCodeExchangeAndProfileUpdate(
  requestUrl: URL,
  code: string
): Promise<NextResponse> {
  // Use secure Publishable Key client with cookie handling
  const supabase = await createClient();

  // 1. Exchange Code
  const { data, error: exchangeError } = (await supabase.auth.exchangeCodeForSession(code)) as {
    data: { session: Session | null; user: User | null };
    error: unknown;
  };

  if (exchangeError) {
    console.error('Session exchange error:', exchangeError);
    return NextResponse.redirect(
      new URL('/login?error=session_exchange_failed', requestUrl.origin)
    );
  }

  if (!data.session || !data.user) {
    console.error('No session or user created after code exchange');
    return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin));
  }

  const user: User = data.user;
  const finalRedirectBaseUrl: string = requestUrl.origin;

  // 3. Profile Fetch and Data Merge
  const userMetadata: UserMetadata = user.user_metadata || {};
  const googleGivenName: string | undefined = userMetadata.given_name || userMetadata.first_name;
  const googleFamilyName: string | undefined = userMetadata.family_name || userMetadata.last_name;
  const googlePicture: string | undefined = userMetadata.picture || userMetadata.avatar_url;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select<string, Profile>('*')
    .eq('id', user.id)
    .single();

  // 2. New User Check: based on whether a profile row already existed
  const isNewUser: boolean = !existingProfile;
  console.log(isNewUser ? '🆕 NEW USER DETECTED (no existing profile)' : '👤 EXISTING USER');

  // Fetch private info for checking completeness (phone)
  const { data: privateInfo } = await supabase
    .from('user_private_info')
    .select('phone_number')
    .eq('id', user.id)
    .maybeSingle();

  // Determine completeness using mixed data
  const hasPhonePrivate = !!(
    privateInfo?.phone_number && privateInfo.phone_number.trim().length > 0
  );

  // Build the upsert payload. Include `id` to allow insert-if-missing
  const upsertData: Partial<Profile> & { id: string } = {
    id: user.id,
    first_name: googleGivenName || existingProfile?.first_name || null,
    last_name: googleFamilyName || existingProfile?.last_name || null,
    profile_photo_url: googlePicture || existingProfile?.profile_photo_url || null,
  };

  // 4. Profile Upsert (insert if missing, update if exists)
  const { data: updatedProfile, error: profileError } = await supabase
    .from('profiles')
    .upsert(upsertData, { onConflict: 'id' })
    .select()
    .single<Profile>();

  if (profileError) {
    console.error('❌ Profile upsert error:', profileError);
  } else {
    console.log('✅ Profile upserted with Google data');
  }

  if (!updatedProfile) {
    console.error('Profile upsert failed to return data.');
    return NextResponse.redirect(new URL('/login?error=profile_update_failed', requestUrl.origin));
  }

  // 5. Welcome Email
  if (isNewUser) {
    try {
      await fetch(`/api/emails/send-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      console.log('✅ Welcome email queued');
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
    }
  }

  // 6. Routing
  const redirectPath = determineRedirectPath(
    finalRedirectBaseUrl,
    updatedProfile,
    isNewUser,
    hasPhonePrivate
  );

  // Use NextResponse.redirect() which sets the status and Location header.
  return NextResponse.redirect(redirectPath);
}
/**
 * Handles the OAuth callback from the authentication provider.
 * Exchanges the code for a session and sets up the user profile.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(req.url);
  const code: string | null = requestUrl.searchParams.get('code');
  const error: string | null = requestUrl.searchParams.get('error');
  const errorDescription: string | null = requestUrl.searchParams.get('error_description');

  // 1. Handle OAuth Errors (Guard Clause)
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent(error), requestUrl.origin)
    );
  }

  // 2. Process Authentication Code
  if (code) {
    try {
      return await processCodeExchangeAndProfileUpdate(requestUrl, code);
    } catch (error) {
      // Catch unexpected errors
      console.error('Unexpected error during session exchange:', error);
      return NextResponse.redirect(new URL('/login?error=unexpected_error', requestUrl.origin));
    }
  }

  // 3. Fallback: No Code Present
  console.log('⚠️ No code present - Redirecting to login');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
