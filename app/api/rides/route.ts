import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  ensureProfileComplete,
} from '@/libs/supabase/auth';
import { createRideOrMultiSchema } from '@/libs/validations/trips';
import { z } from 'zod';

/**
 * Creates new ride posts (single or multiple in a series).
 * Supports bulk insertion for multi-date rides.
 * Uses round_trip_group_id to group multi-date series and is_recurring flag.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const profileError = await ensureProfileComplete(supabase, user.id, 'creating rides');
    if (profileError) return profileError;

    const body = await request.json();

    // Validate using Zod schema
    const validationResult = createRideOrMultiSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Handle both single ride and array of rides
    const ridesData = Array.isArray(validationResult.data)
      ? validationResult.data
      : [validationResult.data];

    // Prepare rides for insertion
    const ridesToInsert = ridesData.map((ride) => ({
      poster_id: user.id,
      posting_type: ride.posting_type || 'driver',
      title: ride.title,
      start_location: ride.start_location,
      end_location: ride.end_location,
      departure_date: ride.departure_date,
      departure_time: ride.departure_time,
      return_date: ride.return_date || null,
      return_time: ride.return_time || null,
      is_round_trip: ride.is_round_trip || false,
      trip_direction: ride.trip_direction || null,
      round_trip_group_id: ride.round_trip_group_id || null, // Used for both round trips AND multi-date series
      is_recurring: ride.is_recurring || false, // Set to true for multi-date series
      recurring_days: ride.recurring_days || null,
      price_per_seat: ride.price_per_seat || 0,
      total_seats: ride.total_seats || 1,
      available_seats: ride.available_seats || ride.total_seats || 1,
      car_type: ride.car_type || null,
      has_awd: ride.has_awd || false,
      description: ride.description || null,
      special_instructions: ride.special_instructions || null,
      status: 'active',
    }));

    // Bulk insert
    const { data: createdRides, error } = await supabase
      .from('rides')
      .insert(ridesToInsert)
      .select();

    if (error) {
      console.error('Error creating rides:', error);
      return NextResponse.json(
        {
          error: 'Failed to create rides',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Return array if multiple, single object if one
    return NextResponse.json(createdRides.length === 1 ? createdRides[0] : createdRides);
  } catch (error: unknown) {
    // Handle Zod validation errors that might slip through
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('Create rides API error:', error);
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
 * GET endpoint for fetching rides (existing functionality).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const { searchParams } = new URL(request.url);
    const postingType = searchParams.get('posting_type');
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const offset = Number.parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('rides')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .order('departure_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (postingType) {
      query = query.eq('posting_type', postingType);
    }

    const { data: rides, error, count } = await query;

    if (error) {
      console.error('Error fetching rides:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch rides',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rides: rides || [],
      totalCount: count || 0,
      hasMore: count ? offset + rides.length < count : false,
    });
  } catch (error: unknown) {
    console.error('Fetch rides API error:', error);
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
