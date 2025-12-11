import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  ensureProfileComplete,
} from '@/libs/supabase/auth';
import { sendConversationMessage } from '@/libs/supabase/conversations';
import { z } from 'zod';
import type { Database } from '@/types/database.types';

const bookingActionSchema = z.object({
  action: z.enum(['approve', 'deny', 'cancel']),
});

type TripBookingRow = Database['public']['Tables']['trip_bookings']['Row'];
type RideRow = Database['public']['Tables']['rides']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type BookingRide = Pick<
  RideRow,
  | 'id'
  | 'title'
  | 'start_location'
  | 'end_location'
  | 'departure_date'
  | 'departure_time'
  | 'available_seats'
>;
type BookingProfile = Pick<ProfileRow, 'id' | 'first_name' | 'last_name'>;
type BookingWithRelations = TripBookingRow & {
  ride?: BookingRide | null;
  driver?: BookingProfile | null;
  passenger?: BookingProfile | null;
};

/**
 * Allows the recipient of a booking request or invitation to approve or deny it directly from messages.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  // Fallback to the final segment in the URL when Next fails to populate params.
  const fallbackBookingId =
    pathSegments.length > 3 ? pathSegments[pathSegments.length - 1] : undefined;
  const { bookingId: paramBookingId } = await params;
  const bookingId = ((paramBookingId ?? '').trim() || (fallbackBookingId ?? '')).trim();

  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const profileError = await ensureProfileComplete(
      supabase,
      user.id,
      'responding to a booking request'
    );
    if (profileError) return profileError;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const body = bookingActionSchema.parse(await request.json());

    const booking = await fetchBooking(supabase, bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const userRole = getUserRole(booking, user.id);
    if (userRole === 'none') {
      return NextResponse.json({ error: 'Not authorized to modify this booking' }, { status: 403 });
    }

    const actionType = getActionType(body.action, booking, userRole);
    if (actionType === 'invalid') {
      return NextResponse.json(
        { error: 'Invalid action for the current booking state' },
        { status: 400 }
      );
    }

    const nextStatus = body.action === 'approve' ? 'confirmed' : 'cancelled';

    const bookingRide = booking.ride;
    if (nextStatus === 'confirmed' && bookingRide && bookingRide.available_seats !== null) {
      const seatResult = await handleSeatUpdate(supabase, bookingRide);
      if (seatResult !== true) {
        return NextResponse.json({ error: seatResult }, { status: 400 });
      }
    }

    const updateResult = await updateBookingStatus(supabase, bookingId, nextStatus);
    if (updateResult !== true) {
      throw updateResult;
    }

    const content = buildBookingMessage({
      booking,
      userRole,
      action: body.action,
    });

    try {
      const recipientId = userRole === 'driver' ? booking.passenger_id : booking.driver_id;
      await sendConversationMessage({
        supabase,
        senderId: user.id,
        recipientId,
        rideId: booking.ride_id,
        content,
      });
    } catch (conversationError: unknown) {
      console.error('Error notifying participant about booking response', conversationError);
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error('Error updating booking status', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Fetches the booking and related entities.
 */
async function fetchBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string
): Promise<BookingWithRelations | null> {
  const { data: booking, error } = await supabase
    .from('trip_bookings')
    .select(
      `*,
      ride:rides(id, title, start_location, end_location, departure_date, departure_time, available_seats),
      driver:profiles!trip_bookings_driver_id_fkey(id, first_name, last_name),
      passenger:profiles!trip_bookings_passenger_id_fkey(id, first_name, last_name)`
    )
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !booking) return null;
  return booking as BookingWithRelations;
}

/**
 * Determines the user's role in the booking.
 */
function getUserRole(
  booking: BookingWithRelations,
  userId: string
): 'driver' | 'passenger' | 'none' {
  if (booking.driver_id === userId) return 'driver';
  if (booking.passenger_id === userId) return 'passenger';
  return 'none';
}

/**
 * Determines if the action is valid for the current booking state and user role.
 *
 * Valid combinations:
 * - Driver can approve/deny pending bookings (passenger requested to join)
 * - Driver can deny invited bookings (driver cancels their own invitation)
 * - Passenger can approve/deny invited bookings (driver invited passenger)
 * - Passenger can cancel pending bookings (passenger cancels their own request)
 */
function getActionType(
  action: 'approve' | 'deny' | 'cancel',
  booking: BookingWithRelations,
  userRole: 'driver' | 'passenger' | 'none'
): 'approve' | 'deny' | 'cancel' | 'invalid' {
  const status = booking.status;
  if (action === 'approve') {
    if (
      (userRole === 'driver' && status === 'pending') ||
      (userRole === 'passenger' && status === 'invited')
    ) {
      return 'approve';
    }
  }
  if (action === 'deny') {
    if (
      (userRole === 'driver' && (status === 'pending' || status === 'invited')) ||
      (userRole === 'passenger' && status === 'invited')
    ) {
      return 'deny';
    }
  }
  if (action === 'cancel') {
    if (userRole === 'passenger' && status === 'pending') {
      return 'cancel';
    }
  }
  return 'invalid';
}

/**
 * Handles seat update for confirmed bookings.
 */
async function handleSeatUpdate(
  supabase: SupabaseClient<Database>,
  ride: BookingRide
): Promise<true | string> {
  if (!ride.available_seats || ride.available_seats <= 0) {
    return 'No seats available';
  }
  const { error } = await supabase
    .from('rides')
    .update({ available_seats: Math.max(ride.available_seats - 1, 0) })
    .eq('id', ride.id);
  if (error) {
    return 'Failed to update available seats';
  }
  return true;
}

/**
 * Updates the booking status.
 */
async function updateBookingStatus(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  nextStatus: string
): Promise<true | Error> {
  const { error } = await supabase
    .from('trip_bookings')
    .update({
      status: nextStatus,
      confirmed_at: nextStatus === 'confirmed' ? new Date().toISOString() : null,
    })
    .eq('id', bookingId);
  if (error) return error;
  return true;
}

/**
 * Builds the booking message content for notifications.
 */
function buildBookingMessage({
  booking,
  userRole,
  action,
}: {
  booking: BookingWithRelations;
  userRole: 'driver' | 'passenger';
  action: 'approve' | 'deny' | 'cancel';
}): string {
  const rideLabel = booking.ride
    ? booking.ride.title || `${booking.ride.start_location} → ${booking.ride.end_location}`
    : 'the trip';

  const pickupTime = booking.pickup_time
    ? new Date(booking.pickup_time).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  const passengerName = booking.passenger
    ? `${booking.passenger.first_name ?? ''} ${booking.passenger.last_name ?? ''}`.trim()
    : 'Passenger';
  const driverName = booking.driver
    ? `${booking.driver.first_name ?? ''} ${booking.driver.last_name ?? ''}`.trim()
    : 'Driver';

  if (userRole === 'driver') {
    if (action === 'approve') {
      return `I confirmed ${passengerName} for ${rideLabel}. Pickup: ${booking.pickup_location ?? 'TBD'} ${pickupTime}`;
    }
    if (action === 'deny') {
      // Driver denying a passenger request (pending) vs canceling their own invitation (invited)
      if (booking.status === 'invited') {
        return `I cancelled the invitation to ${passengerName} for ${rideLabel}.`;
      }
      return `I declined the request from ${passengerName} for ${rideLabel}.`;
    }
  } else if (action === 'cancel') {
    return `I cancelled my request for ${rideLabel}. Pickup: ${booking.pickup_location ?? 'TBD'} ${pickupTime}`;
  } else if (action === 'approve') {
    return `I accepted the invite from ${driverName} for ${rideLabel}. Pickup: ${booking.pickup_location ?? 'TBD'} ${pickupTime}`;
  } else if (action === 'deny') {
    return `I declined the invitation from ${driverName} for ${rideLabel}.`;
  }
  return '';
}
