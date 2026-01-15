import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/supabase/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Number.parseInt(searchParams.get('limit') || '24'));
    const offset = (page - 1) * limit;
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Build the main query for eligible profiles
    let query = supabase
      .from('profiles')
      .select(
        `
        id,
        first_name,
        profile_photo_url,
        city,

        pronouns,
        bio,
        display_lat,
        display_lng,
        updated_at
      `,
        { count: 'exact' }
      )
      .not('bio', 'is', null)
      .neq('bio', '');

    query = query
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        {
          status: 500,
        }
      );
    }

    console.log('Profiles fetched:', profiles?.length || 0, 'Total:', count);

    // Process the data to match the required format
    const processedProfiles = (profiles || []).map((profile) => {
      // Calculate last_online_at from profiles.updated_at
      const lastOnlineAt = profile.updated_at;

      // Truncate bio to ~140 characters
      let bioExcerpt = '';
      if (profile.bio) {
        bioExcerpt = profile.bio.length > 140 ? profile.bio.substring(0, 140) + '...' : profile.bio;
      }

      return {
        id: profile.id,
        first_name: profile.first_name,
        photo_url: profile.profile_photo_url,
        city: profile.city,

        pronouns: profile.pronouns || null,
        bio_excerpt: bioExcerpt,
        display_lat: profile.display_lat,
        display_lng: profile.display_lng,
        last_online_at: lastOnlineAt,
      };
    });

    return NextResponse.json({
      items: processedProfiles,
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error in profiles API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
      }
    );
  }
}
