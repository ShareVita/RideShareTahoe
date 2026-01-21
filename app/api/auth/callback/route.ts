import { type NextRequest, NextResponse } from 'next/server';
import { authRateLimit } from '@/libs/rateLimit';
import { createClient } from '@/libs/supabase/server';
import { type Session, type User, type UserMetadata } from '@supabase/supabase-js';
import { getAppUrl, sanitizeForLog } from '@/libs/email';
import { getSafeError } from '@/lib/errorMap';

// #region Types & Interfaces

/**
 * Local representation of the database profile schema.
 */
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

// #endregion

// #region Navigation Helpers

/**
 * Determines the final destination URL based on user status and profile completeness.
 * * @param {string} finalRedirectBaseUrl - Trusted base URL for the application.
 * @param {Profile} profile - The user's profile data.
 * @param {boolean} isNewUser - Whether the user is logging in for the first time.
 * @param {boolean} hasPhonePrivate - Presence of phone number in private storage.
 * @returns {string} The redirect URL with a cache-busting parameter.
 */
function determineRedirectPath(
  finalRedirectBaseUrl: string,
  profile: Profile,
  isNewUser: boolean,
  hasPhonePrivate: boolean
): string {
  const cacheBust: string = `_t=${Date.now()}`;

  if (isNewUser) {
    console.log('🆕 NEW USER → Redirecting to /profile/edit');
    return `${finalRedirectBaseUrl}/profile/edit?${cacheBust}`;
  }

  const hasRole: boolean = !!profile.role && profile.role.trim().length > 0;
  const hasLocation: boolean = profile.display_lat !== null && profile.display_lng !== null;

  console.log('📊 Profile completeness check:');
  console.log('   ✓ Role:', hasRole ? '✅ Complete' : '❌ Missing');
  console.log('   ✓ Phone:', hasPhonePrivate ? '✅ Complete' : '❌ Missing');
  console.log(
    '   ✓ Location:',
    hasLocation ? '✅ Verified (display_lat/lng present)' : '❌ Missing'
  );

  if (hasRole && hasPhonePrivate && hasLocation) {
    console.log('✅ PROFILE COMPLETE → Redirecting to /community');
    return `${finalRedirectBaseUrl}/community?${cacheBust}`;
  } else {
    console.log('📝 PROFILE INCOMPLETE → Redirecting to /profile/edit');
    return `${finalRedirectBaseUrl}/profile/edit?${cacheBust}`;
  }
}

/**
 * Checks the email_events table to determine if a welcome email has been sent.
 * * @param {Awaited<ReturnType<typeof createClient>>} supabase - Supabase client instance.
 * @param {string} userId - Target user UUID.
 * @returns {Promise<boolean>}
 */
async function hasWelcomeEmailBeenSent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data: welcomeEmailRecord } = await supabase
    .from('email_events')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', 'welcome')
    .maybeSingle();

  return !!welcomeEmailRecord;
}

// #endregion

// #region Core Logic

/**
 * Executes the OAuth code exchange and synchronizes provider metadata with the database.
 * * @param {URL} requestUrl - The incoming request URL containing the code.
 * @param {string} code - OAuth2 authorization code.
 * @returns {Promise<NextResponse>}
 */
async function processCodeExchangeAndProfileUpdate(
  requestUrl: URL,
  code: string
): Promise<NextResponse> {
  const supabase = await createClient();

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
  const finalRedirectBaseUrl: string = getAppUrl();

  const userMetadata: UserMetadata = user.user_metadata || {};
  const googleGivenName: string | undefined = userMetadata.given_name || userMetadata.first_name;
  const googleFamilyName: string | undefined = userMetadata.family_name || userMetadata.last_name;
  const googlePicture: string | undefined = userMetadata.picture || userMetadata.avatar_url;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select<string, Profile>('*')
    .eq('id', user.id)
    .single();

  const welcomeAlreadySent: boolean = await hasWelcomeEmailBeenSent(supabase, user.id);
  const isNewUser: boolean = !welcomeAlreadySent;

  console.log(
    isNewUser
      ? `🆕 NEW USER DETECTED (no welcome email sent yet) - ${sanitizeForLog(user.id)}`
      : `👤 EXISTING USER - ${sanitizeForLog(user.id)}`
  );

  console.log(`[Auth] User email from OAuth: ${user.email || 'NOT AVAILABLE'}`);
  if (user.email) {
    try {
      const supabaseAdmin = await createClient('service_role');
      const { error: privateInfoError } = await supabaseAdmin
        .from('user_private_info')
        .upsert({ id: user.id, email: user.email }, { onConflict: 'id' });
      if (privateInfoError) {
        console.error('❌ Failed to upsert user_private_info:', JSON.stringify(privateInfoError));
      } else {
        console.log(`✅ User email stored in user_private_info for ${sanitizeForLog(user.id)}`);
      }
    } catch (err) {
      console.error('❌ Exception upserting user_private_info:', err);
    }
  } else {
    console.error('❌ No email available from OAuth user object');
  }

  const { data: privateInfo } = await supabase
    .from('user_private_info')
    .select('phone_number')
    .eq('id', user.id)
    .maybeSingle();

  const hasPhonePrivate: boolean = !!(
    privateInfo?.phone_number && privateInfo.phone_number.trim().length > 0
  );

  const upsertData: Partial<Profile> & { id: string } = {
    id: user.id,
    first_name: googleGivenName || existingProfile?.first_name || null,
    last_name: googleFamilyName || existingProfile?.last_name || null,
    profile_photo_url: googlePicture || existingProfile?.profile_photo_url || null,
  };

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

  if (isNewUser) {
    try {
      const appUrl: string = getAppUrl();
      const emailResponse: Response = await fetch(`${appUrl}/api/emails/send-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!emailResponse.ok) {
        const errorText: string = await emailResponse.text();
        console.error(
          `❌ Welcome email API error: ${emailResponse.status} - ${sanitizeForLog(errorText)}`
        );
      } else {
        console.log(`✅ Welcome email sent for user ${sanitizeForLog(user.id)}`);
      }
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
    }
  }

  const redirectPath: string = determineRedirectPath(
    finalRedirectBaseUrl,
    updatedProfile,
    isNewUser,
    hasPhonePrivate
  );

  return NextResponse.redirect(redirectPath);
}

// #endregion

// #region Handlers

/**
 * Route handler for the authentication callback.
 * * @param {NextRequest} req - Incoming Next.js request.
 * @returns {Promise<NextResponse>}
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestUrl: URL = new URL(req.url);
  const code: string | null = requestUrl.searchParams.get('code');
  const error: string | null = requestUrl.searchParams.get('error');
  const errorDescription: string | null = requestUrl.searchParams.get('error_description');
  const appUrl = getAppUrl();

  if (error) {
    const safeError = getSafeError(error);
    const safeErrorDescription = errorDescription ? sanitizeForLog(errorDescription) : null;
    console.error('OAuth error:', safeError, safeErrorDescription);
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(safeError), appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', appUrl));
  }

  const rl = authRateLimit(req as unknown as Request);

  if (!rl.success) {
    return NextResponse.redirect(new URL('/login?error=rate_limited', appUrl));
  }

  try {
    return await processCodeExchangeAndProfileUpdate(requestUrl, code);
  } catch (err) {
    console.error('Critical Auth Failure:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', appUrl));
  }
}

// #endregion
