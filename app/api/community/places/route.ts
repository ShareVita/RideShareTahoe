import { NextRequest, NextResponse } from 'next/server';
import {
  createUnauthorizedResponse,
  ensureProfileComplete,
  getAuthenticatedUser,
} from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const placeType = searchParams.get('type');
    const dogFriendly = searchParams.get('dog_friendly');
    const limit = Number.parseInt(searchParams.get('limit') || '10');
    const offset = Number.parseInt(searchParams.get('offset') || '0');

    // Build query with optimized select
    let query = supabase
      .from('local_places')
      .select(
        `
        id,
        name,
        type,
        description,
        address,
        rating,
        dog_friendly,
        created_at,
        created_by:profiles!local_places_created_by_fkey(
          id,
          first_name,
          last_name
        )
      `
      )
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (placeType) {
      query = query.eq('type', placeType);
    }

    if (dogFriendly !== null) {
      query = query.eq('dog_friendly', dogFriendly === 'true');
    }

    const { data: places, error } = await query;

    if (error) {
      console.error('Error fetching places:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch places',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(places || []);
  } catch (error: unknown) {
    console.error('Places API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const profileError = await ensureProfileComplete(supabase, user.id, 'adding places');
    if (profileError) return profileError;

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.address || !body.type) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, address, type',
        },
        { status: 400 }
      );
    }

    // Create place
    const { data: place, error } = await supabase
      .from('local_places')
      .insert({
        name: body.name,
        type: body.type,
        address: body.address,
        description: body.description,
        dog_friendly: body.dog_friendly !== false, // Default to true
        photo_url: body.photo_url,
        latitude: body.latitude,
        longitude: body.longitude,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating place:', error);
      return NextResponse.json(
        {
          error: 'Failed to create place',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(place);
  } catch (error: unknown) {
    console.error('Create place API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
