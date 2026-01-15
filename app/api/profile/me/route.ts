'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/supabase/auth';

interface ProfileSocialsRow {
  user_id: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  airbnb_url?: string | null;
  other_social_url?: string | null;
}

interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;

  profile_photo_url?: string | null;
  city?: string | null;
  state?: string | null;
  bio?: string | null;
  pronouns?: string | null;
}

interface ProfileResponse {
  profile: ProfileRow | null;
  socials: ProfileSocialsRow | null;
}

/**
 * Retrieves the authenticated user's profile and social links.
 * Used for populating the user dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      console.error('Unable to fetch profile for dashboard', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const { data: socials, error: socialsError } = await supabase
      .from('profile_socials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (socialsError) {
      console.error('Unable to fetch profile socials for dashboard', socialsError);
    }

    const payload: ProfileResponse = {
      profile: profile || null,
      socials: socials || null,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Unexpected error in /api/profile/me', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
