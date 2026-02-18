import { type NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  type EmailOtpType,
  type Session,
  type User,
  type UserMetadata,
} from '@supabase/supabase-js';
import {
  getAppUrl,
  recordUserActivity,
  sanitizeForLog,
  scheduleCommunityGrowthEmail,
  scheduleNurtureEmail,
  sendEmail,
} from '@/libs/email';

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
 * Check if welcome email was already sent to this user (idempotent check).
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

/**
 * Shared logic after a session is established: profile sync, emails, and routing.
 * Used by both OAuth (code exchange) and magic link (token_hash) flows.
 */
async function processAuthenticatedUser(
  requestUrl: URL,
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User
): Promise<NextResponse> {
  const finalRedirectBaseUrl: string = requestUrl.origin;

  const userMetadata: UserMetadata = user.user_metadata || {};
  const googleGivenName: string | undefined = userMetadata.given_name || userMetadata.first_name;
  const googleFamilyName: string | undefined = userMetadata.family_name || userMetadata.last_name;
  const googlePicture: string | undefined = userMetadata.picture || userMetadata.avatar_url;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select<string, Profile>('*')
    .eq('id', user.id)
    .single();

  const welcomeAlreadySent = await hasWelcomeEmailBeenSent(supabase, user.id);
  const isNewUser: boolean = !welcomeAlreadySent;
  console.log(
    isNewUser
      ? `🆕 NEW USER DETECTED (no welcome email sent yet) - ${sanitizeForLog(user.id)}`
      : `👤 EXISTING USER - ${sanitizeForLog(user.id)}`
  );

  console.log(`[Auth] User email: ${user.email || 'NOT AVAILABLE'}`);
  if (user.email) {
    try {
      const supabaseAdmin = createAdminClient();
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
    console.error('❌ No email available from user object');
  }

  const { data: privateInfo } = await supabase
    .from('user_private_info')
    .select('phone_number')
    .eq('id', user.id)
    .maybeSingle();

  const hasPhonePrivate = !!(
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
    console.log('✅ Profile upserted');
  }

  if (!updatedProfile) {
    console.error('Profile upsert failed to return data.');
    return NextResponse.redirect(new URL('/login?error=profile_update_failed', requestUrl.origin));
  }

  if (isNewUser && user.email) {
    try {
      await recordUserActivity({
        userId: user.id,
        event: 'login',
        metadata: { source: 'welcome_email_trigger' },
      });

      await sendEmail({
        userId: user.id,
        to: user.email,
        emailType: 'welcome',
        payload: {
          userName: googleGivenName || '',
          appUrl: getAppUrl(),
        },
      });

      await scheduleNurtureEmail(user.id);
      await scheduleCommunityGrowthEmail(user.id);

      console.log(`✅ Welcome email sent to user ${sanitizeForLog(user.id)}`);
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
    }
  }

  const redirectPath = determineRedirectPath(
    finalRedirectBaseUrl,
    updatedProfile,
    isNewUser,
    hasPhonePrivate
  );

  return NextResponse.redirect(redirectPath);
}

/**
 * Handles the OAuth PKCE code exchange flow (Google).
 */
async function processCodeExchange(requestUrl: URL, code: string): Promise<NextResponse> {
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

  return processAuthenticatedUser(requestUrl, supabase, data.user);
}

/**
 * Handles the magic link (email OTP) flow.
 * Supabase sends token_hash + type params instead of a code for magic links.
 */
async function processMagicLink(
  requestUrl: URL,
  tokenHash: string,
  type: string
): Promise<NextResponse> {
  const supabase = await createClient();

  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (verifyError) {
    console.error('Magic link verification error:', verifyError);
    return NextResponse.redirect(
      new URL('/login?error=session_exchange_failed', requestUrl.origin)
    );
  }

  if (!data.session || !data.user) {
    console.error('No session or user created after magic link verification');
    return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin));
  }

  return processAuthenticatedUser(requestUrl, supabase, data.user);
}

/**
 * Handles the auth callback from both OAuth providers (Google) and magic links.
 * - OAuth: receives ?code= param → exchanges for session
 * - Magic link: receives ?token_hash= + ?type= params → verifies OTP
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(req.url);
  const code: string | null = requestUrl.searchParams.get('code');
  const tokenHash: string | null = requestUrl.searchParams.get('token_hash');
  const type: string | null = requestUrl.searchParams.get('type');
  const error: string | null = requestUrl.searchParams.get('error');
  const errorDescription: string | null = requestUrl.searchParams.get('error_description');

  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent(error), requestUrl.origin)
    );
  }

  // Google OAuth flow
  if (code) {
    try {
      return await processCodeExchange(requestUrl, code);
    } catch (err) {
      console.error('Unexpected error during session exchange:', err);
      return NextResponse.redirect(new URL('/login?error=unexpected_error', requestUrl.origin));
    }
  }

  // Magic link flow
  if (tokenHash && type) {
    try {
      return await processMagicLink(requestUrl, tokenHash, type);
    } catch (err) {
      console.error('Unexpected error during magic link verification:', err);
      return NextResponse.redirect(new URL('/login?error=unexpected_error', requestUrl.origin));
    }
  }

  console.log('⚠️ No code or token_hash present - Redirecting to login');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
