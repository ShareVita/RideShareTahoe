import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  ensureProfileComplete,
} from '@/libs/supabase/auth';
import { z } from 'zod';
import { sendConversationMessage } from '@/libs/supabase/conversations';

// Custom UUID validator that accepts any hex string in UUID format (including test UUIDs)
const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID format');

const invitationSchema = z.object({
  ride_id: uuidSchema,
  passenger_id: uuidSchema,
  pickup_location: z.string().min(3).max(100),
  pickup_time: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid pickup timestamp'),
  driver_notes: z.string().max(500).optional(),
});

/**
 * Sends a ride invitation from a driver to a specific passenger and notifies the passenger via messages.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const profileError = await ensureProfileComplete(supabase, user.id, 'inviting a rider');
    if (profileError) return profileError;

    const json = await request.json();
    const body = invitationSchema.parse(json);

    if (body.passenger_id === user.id) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
    }

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select(
        'poster_id, available_seats, status, title, start_location, end_location, departure_date, departure_time'
      )
      .eq('id', body.ride_id)
      .single();

    if (rideError || !ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.poster_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the driver for this ride can invite riders' },
        { status: 403 }
      );
    }

    if (ride.status !== 'active') {
      return NextResponse.json({ error: 'Ride is no longer active' }, { status: 400 });
    }

    if (ride.available_seats !== null && ride.available_seats <= 0) {
      return NextResponse.json({ error: 'No seats available' }, { status: 400 });
    }

    const { data: existingBooking } = await supabase
      .from('trip_bookings')
      .select('id, status')
      .eq('ride_id', body.ride_id)
      .eq('passenger_id', body.passenger_id)
      .in('status', ['pending', 'confirmed', 'invited'])
      .maybeSingle();

    if (existingBooking) {
      return NextResponse.json(
        { error: 'This rider already has a booking or invitation for this ride' },
        { status: 400 }
      );
    }

    const { data: booking, error: insertError } = await supabase
      .from('trip_bookings')
      .insert({
        ride_id: body.ride_id,
        driver_id: user.id,
        passenger_id: body.passenger_id,
        pickup_location: body.pickup_location,
        pickup_time: new Date(body.pickup_time).toISOString(),
        status: 'invited',
        driver_notes: body.driver_notes,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Decrement available seats when invitation is created (if seats are tracked)
    if (ride.available_seats !== null) {
      const { error: seatUpdateError } = await supabase
        .from('rides')
        .update({ available_seats: ride.available_seats - 1 })
        .eq('id', body.ride_id)
        .gt('available_seats', 0); // Only update if seats are still available

      if (seatUpdateError) {
        // If seat update fails, we need to roll back the booking
        await supabase.from('trip_bookings').delete().eq('id', booking.id);
        return NextResponse.json(
          { error: 'Failed to reserve seat for invitation' },
          { status: 500 }
        );
      }
    }

    try {
      const { data: driverProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();

      const driverName = driverProfile
        ? `${driverProfile.first_name ?? 'Driver'} ${driverProfile.last_name ?? ''}`.trim()
        : 'Driver';

      const rideLabel = ride.title
        ? `${ride.title}`
        : `${ride.start_location} → ${ride.end_location}`;

      const noteSuffix = body.driver_notes ? ` Note: "${body.driver_notes}".` : '';

      const content = `${driverName} invited you to join the ride (${rideLabel}) on ${ride.departure_date} at ${ride.departure_time}.${noteSuffix}`;

      await sendConversationMessage({
        supabase,
        senderId: user.id,
        recipientId: body.passenger_id,
        rideId: body.ride_id,
        content,
      });
    } catch (conversationError: unknown) {
      console.error('Unable to notify passenger about invitation', conversationError);
    }

    return NextResponse.json(booking);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating invitation', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
