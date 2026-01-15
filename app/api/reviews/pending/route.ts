import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/supabase/auth';

interface BookingWithProfiles {
  id: string;
  driver_id: string;
  passenger_id: string;
  status: string;
  ride: {
    title: string;
    departure_date: string;
    departure_time: string;
    start_location: string;
    end_location: string;
  };
  driver: { id: string; first_name: string; last_name: string } | null;
  passenger: { id: string; first_name: string; last_name: string } | null;
  [key: string]: unknown;
}

/**
 * Retrieves a list of past bookings that the current user has not yet reviewed.
 * Filters for confirmed or completed bookings where the trip date has passed.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Fetch confirmed/completed bookings where the user is a participant
    const { data: bookings, error: bookingsError } = await supabase
      .from('trip_bookings')
      .select(
        `
        id,
        driver_id,
        passenger_id,
        status,
        ride:rides(title, departure_date, departure_time, start_location, end_location),
        driver:profiles!trip_bookings_driver_id_fkey(id, first_name, last_name),
        passenger:profiles!trip_bookings_passenger_id_fkey(id, first_name, last_name)
      `
      )
      .or(`driver_id.eq.${user.id},passenger_id.eq.${user.id}`)
      .in('status', ['confirmed', 'completed']);

    if (bookingsError) throw bookingsError;

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ pendingReviews: [] });
    }

    // Filter for rides that have passed
    const pastBookings = (bookings as unknown as BookingWithProfiles[]).filter((booking) => {
      const dateTimeString = `${booking.ride.departure_date}T${booking.ride.departure_time}`;
      const rideDate = new Date(dateTimeString);
      return rideDate < new Date();
    });

    if (pastBookings.length === 0) {
      return NextResponse.json({ pendingReviews: [] });
    }

    // Fetch existing reviews to identify which bookings are already reviewed
    const bookingIds = pastBookings.map((b) => b.id);
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('booking_id')
      .eq('reviewer_id', user.id)
      .in('booking_id', bookingIds);

    if (reviewsError) throw reviewsError;

    const reviewedBookingIds = new Set(reviews?.map((r) => r.booking_id) || []);

    // Exclude already reviewed bookings
    const pendingReviews = pastBookings
      .filter((booking) => !reviewedBookingIds.has(booking.id))
      .map((booking) => {
        const isDriver = booking.driver_id === user.id;
        const otherParticipant = isDriver ? booking.passenger : booking.driver;
        const otherName = otherParticipant
          ? `${otherParticipant.first_name} ${otherParticipant.last_name}`
          : 'Unknown User';

        return {
          meeting_id: booking.id, // Keeping property name for frontend compatibility for now, but value is booking.id
          booking_id: booking.id,
          meeting_title: booking.ride.title || `Ride to ${booking.ride.end_location}`,
          other_participant_name: otherName,
          other_participant_id: otherParticipant?.id,
        };
      });

    return NextResponse.json({ pendingReviews });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending reviews' },
      {
        status: 500,
      }
    );
  }
}
