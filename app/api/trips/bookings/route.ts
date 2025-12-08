import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';
import { NextRequest, NextResponse } from 'next/server';
import { createTripBookingSchema } from '@/libs/validations/trips';
import { z } from 'zod';

/**
 * Creates a new trip booking request.
 * Validates ride availability, seat count, and ensures no self-booking.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const json = await request.json();
    const body = createTripBookingSchema.parse(json);

    // Fetch ride to check availability and get driver_id
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('poster_id, available_seats, status')
      .eq('id', body.ride_id)
      .single();

    if (rideError || !ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.poster_id === user.id) {
      return NextResponse.json({ error: 'You cannot book your own ride' }, { status: 400 });
    }

    if (ride.status !== 'active') {
      return NextResponse.json({ error: 'Ride is no longer active' }, { status: 400 });
    }

    if (ride.available_seats !== null && ride.available_seats <= 0) {
      return NextResponse.json({ error: 'No seats available' }, { status: 400 });
    }

    // Check if already booked
    const { data: existingBooking } = await supabase
      .from('trip_bookings')
      .select('id')
      .eq('ride_id', body.ride_id)
      .eq('passenger_id', user.id)
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: 'You have already requested to join this ride' },
        { status: 400 }
      );
    }

    const { data: booking, error: insertError } = await supabase
      .from('trip_bookings')
      .insert({
        ride_id: body.ride_id,
        driver_id: ride.poster_id,
        passenger_id: user.id,
        pickup_location: body.pickup_location,
        pickup_time: new Date(`${body.pickup_date}T${body.pickup_time}:00`).toISOString(),
        passenger_notes: body.passenger_notes,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
