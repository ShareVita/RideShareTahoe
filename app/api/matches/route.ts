import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';
import { calculateDistance } from '@/libs/distance';

/**
 * Finds potential carpool matches based on location proximity and user role.
 * - Drivers see passengers.
 * - Passengers see drivers.
 * - Results are sorted by distance.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '4');
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Fetch profile for role-based matching logic
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_lat, display_lng, role, first_name')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      console.error('Error fetching current profile:', profileError);
      return NextResponse.json(
        { error: 'Profile not found' },
        {
          status: 404,
        }
      );
    }

    if (!currentProfile.display_lat || !currentProfile.display_lng) {
      return NextResponse.json(
        {
          error: 'Location not set',
          needsLocation: true,
        },
        { status: 400 }
      );
    }

    console.log('Current user profile:', {
      id: currentProfile.id,
      role: currentProfile.role,
      location: {
        lat: currentProfile.display_lat,
        lng: currentProfile.display_lng,
      },
    });

    // Determine matching strategy based on current user's role
    let targetRoles: string[] = [];

    if (currentProfile.role === 'driver') {
      // Drivers should see passengers
      targetRoles = ['passenger', 'both'];
    } else if (currentProfile.role === 'passenger') {
      // Passengers should see drivers
      targetRoles = ['driver', 'both'];
    } else if (currentProfile.role === 'both') {
      // "Both" users see everyone
      targetRoles = ['driver', 'passenger', 'both'];
    }

    console.log('Matching criteria:', { targetRoles });

    // Fetch closest profiles matching the target role criteria
    const profileQuery = supabase
      .from('profiles')
      .select(
        `
        id,
        first_name,
        last_name,
        profile_photo_url,
        bio,
        city,
        role,
        display_lat,
        display_lng,
        street_address,
        state,
        zip_code
      `
      )
      .in('role', targetRoles)
      .neq('id', user.id)
      .not('display_lat', 'is', null)
      .not('display_lng', 'is', null);

    const { data: profiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        {
          status: 500,
        }
      );
    }

    console.log(`Found ${profiles?.length || 0} potential matches`);

    // Calculate distances and sort
    const matchesWithDistance = (profiles || []).map((profile) => {
      const distance = calculateDistance(
        currentProfile.display_lat,
        currentProfile.display_lng,
        profile.display_lat,
        profile.display_lng
      );

      return {
        ...profile,
        distance,
      };
    });

    // Sort by distance and limit
    const nearestMatches = matchesWithDistance
      .toSorted((a, b) => a.distance - b.distance)
      .slice(0, limit);

    console.log(
      `Sorted matches by distance:`,
      nearestMatches.map((m) => ({
        name: m.first_name,
        city: m.city,
        distance: m.distance.toFixed(2),
      }))
    );

    console.log(`Returning top ${nearestMatches.length} nearest matches`);

    return NextResponse.json({
      matches: nearestMatches,
      total: nearestMatches.length,
    });
  } catch (error) {
    console.error('Error in matches API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
      }
    );
  }
}
