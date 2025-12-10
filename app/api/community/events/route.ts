import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  ensureProfileComplete,
} from '@/libs/supabase/auth';

/**
 * Retrieves a list of upcoming community events.
 * Filters by event type and sorts by date.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('event_type');
    const limit = Number.parseInt(searchParams.get('limit') || '10');
    const offset = Number.parseInt(searchParams.get('offset') || '0');

    // Build query with optimized select
    let query = supabase
      .from('community_events')
      .select(
        `
        id,
        title,
        description,
        event_type,
        event_date,
        location,
        max_participants,
        current_participants,
        created_at,
        organizer:profiles!community_events_organizer_id_fkey(
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `
      )
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch events',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(events || []);
  } catch (error: unknown) {
    console.error('Events API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: message,
      },
      { status: 500 }
    );
  }
}

/**
 * Creates a new community event.
 * Requires title, date, and location.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const profileError = await ensureProfileComplete(supabase, user.id, 'creating events');
    if (profileError) return profileError;

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.event_date || !body.location) {
      return NextResponse.json(
        {
          error: 'Missing required fields: title, event_date, location',
        },
        { status: 400 }
      );
    }

    // Create event
    const { data: event, error } = await supabase
      .from('community_events')
      .insert({
        title: body.title,
        description: body.description,
        event_date: body.event_date,
        location: body.location,
        organizer_id: user.id,
        max_participants: body.max_participants || 50,
        event_type: body.event_type || 'meetup',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json(
        {
          error: 'Failed to create event',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(event);
  } catch (error: unknown) {
    console.error('Create event API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: message,
      },
      { status: 500 }
    );
  }
}
