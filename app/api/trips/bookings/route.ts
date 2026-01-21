import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  ensureProfileComplete,
} from '@/libs/supabase/auth';
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';
import { createTripBookingSchema } from '@/libs/validations/trips';
import { z } from 'zod';
import { sendConversationMessage } from '@/libs/supabase/conversations';

/**
 * Creates a new trip booking request.
 * Validates ride availability, seat count, and ensures no self-booking.
 */
export const POST = withErrorHandling(async (request?: Request | NextRequest) => {
  const req = request as NextRequest;
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const profileError = await ensureProfileComplete(supabase, user.id, 'booking a ride');
    if (profileError) return profileError;

    const json = await req.json();
    const body = createTripBookingSchema.parse(json);

    // Fetch ride to check availability and get driver_id
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, poster_id, available_seats, status, title, start_location, end_location')
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
    const pickupTimestamp = new Date(`${body.pickup_date}T${body.pickup_time}:00`).toISOString();
    const bookingPayload = {
      pickup_location: body.pickup_location,
      pickup_time: pickupTimestamp,
      passenger_notes: body.passenger_notes ?? null,
    };

    const { data: existingBooking, error: existingBookingError } = await supabase
      .from('trip_bookings')
      .select('id, status')
      .eq('ride_id', body.ride_id)
      .eq('passenger_id', user.id)
      .maybeSingle();

    if (existingBookingError) {
      console.error('Error checking existing booking', existingBookingError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    let booking;

    if (existingBooking) {
      if (existingBooking.status !== 'cancelled') {
        return NextResponse.json(
          { error: 'You have already requested to join this ride' },
          { status: 400 }
        );
      }

      const { data: reopenedBooking, error: reopenError } = await supabase
        .from('trip_bookings')
        .update({
          ...bookingPayload,
          status: 'pending',
          confirmed_at: null,
        })
        .eq('id', existingBooking.id)
        .select()
        .single();

      if (reopenError || !reopenedBooking) {
        return NextResponse.json({ error: 'Unable to reopen booking' }, { status: 500 });
      }

      booking = reopenedBooking;
    } else {
      const { data: newBooking, error: insertError } = await supabase
        .from('trip_bookings')
        .insert({
          ride_id: body.ride_id,
          driver_id: ride.poster_id,
          passenger_id: user.id,
          ...bookingPayload,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      booking = newBooking;
    }

    try {
      await notifyDriverAboutBookingRequest({
        supabase,
        driverId: ride.poster_id,
        passengerId: user.id,
        ride: {
          id: ride.id,
          title: ride.title,
          start_location: ride.start_location,
          end_location: ride.end_location,
        },
        pickupDate: body.pickup_date,
        pickupTime: body.pickup_time,
        passengerNotes: body.passenger_notes,
      });
    } catch (conversationError: unknown) {
      console.error('Unable to notify driver about new booking request', conversationError);
    }

    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

interface RideSummary {
  id: string;
  title?: string | null;
  start_location?: string | null;
  end_location?: string | null;
}

interface NotifyDriverArgs {
  supabase: SupabaseClient;
  driverId: string;
  passengerId: string;
  ride: RideSummary;
  pickupDate: string;
  pickupTime: string;
  passengerNotes?: string | null;
}

async function notifyDriverAboutBookingRequest({
  supabase,
  driverId,
  passengerId,
  ride,
  pickupDate,
  pickupTime,
  passengerNotes,
}: NotifyDriverArgs) {
  const { data: passengerProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', passengerId)
    .maybeSingle();

  const passengerName = passengerProfile
    ? `${passengerProfile.first_name ?? 'Passenger'} ${passengerProfile.last_name ?? ''}`.trim()
    : 'Passenger';

  const startLocation = ride.start_location?.trim();
  const endLocation = ride.end_location?.trim();
  let rideLabel = ride.title?.trim();

  if (!rideLabel) {
    if (startLocation && endLocation) {
      rideLabel = `${startLocation} → ${endLocation}`;
    } else if (startLocation) {
      rideLabel = startLocation;
    } else if (endLocation) {
      rideLabel = endLocation;
    } else {
      rideLabel = 'the ride';
    }
  }

  const noteSuffix = passengerNotes ? ` They wrote: "${passengerNotes}".` : '';

  const messageContent = `${passengerName} just requested to join ${rideLabel} on ${pickupDate} at ${pickupTime}.${noteSuffix}`;

  await sendConversationMessage({
    supabase,
    senderId: passengerId,
    recipientId: driverId,
    rideId: ride.id,
    content: messageContent,
  });
}
