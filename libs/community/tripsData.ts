import type { CommunitySupabaseClient } from './ridesData';
import type { TripBooking } from '@/app/community/types';
import { createTripBookingSchema, updateTripBookingSchema } from '@/libs/validations/trips';
import type { CreateTripBookingInput, UpdateTripBookingInput } from '@/libs/validations/trips';
import type { Database } from '@/types/database.types';

/**
 * Creates a new trip booking (passenger joining a ride).
 */
export const createTripBooking = async (
  supabase: CommunitySupabaseClient,
  userId: string,
  input: CreateTripBookingInput
): Promise<TripBooking> => {
  // Validate input
  const validated = createTripBookingSchema.parse(input);

  // Combine date and time for pickup_time timestamp
  const pickupTimestamp = `${validated.pickup_date}T${validated.pickup_time}:00`;

  // Fetch ride to get driver_id
  const { data: ride, error: rideError } = await supabase
    .from('rides')
    .select('poster_id, available_seats')
    .eq('id', validated.ride_id)
    .single();

  if (rideError || !ride) {
    throw new Error('Ride not found');
  }

  const { data: driver, error: driverError } = await supabase
    .from('profiles')
    .select('deleted_at')
    .eq('id', ride.poster_id)
    .single();
  if (driverError || !driver || driver.deleted_at) {
    throw new Error('This member is no longer available for bookings');
  }

  if (ride.available_seats !== null && ride.available_seats <= 0) {
    throw new Error('No seats available on this ride');
  }

  const { data: booking, error } = await supabase
    .from('trip_bookings')
    .insert({
      id: crypto.randomUUID(),
      ride_id: validated.ride_id,
      driver_id: ride.poster_id,
      passenger_id: userId,
      pickup_location: validated.pickup_location,
      pickup_time: new Date(pickupTimestamp).toISOString(),
      passenger_notes: validated.passenger_notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return booking as unknown as TripBooking;
};

/**
 * Updates a trip booking (e.g. driver accepting/rejecting).
 */
export const updateTripBooking = async (
  supabase: CommunitySupabaseClient,
  bookingId: string,
  input: UpdateTripBookingInput
): Promise<void> => {
  const validated = updateTripBookingSchema.parse(input);

  const updates: Database['public']['Tables']['trip_bookings']['Update'] = {};
  if (validated.status) updates.status = validated.status;
  if (validated.driver_notes) updates.driver_notes = validated.driver_notes;
  if (validated.pickup_location) updates.pickup_location = validated.pickup_location;

  if (validated.status === 'confirmed') {
    updates.confirmed_at = new Date().toISOString();
  }

  // If updating time, we might need existing date? Or assume input is full ISO?
  // Our schema for update has pickup_time as HH:MM.
  // For now let's skip time update in this simple function or handle it if passed complete.
  // We'll rely on specific updateBookingMeetingDetails for complex changes.

  const { error } = await supabase.from('trip_bookings').update(updates).eq('id', bookingId);

  if (error) throw error;
};

/**
 * Fetches all bookings for a specific ride (for driver view).
 */
export const fetchRideBookings = async (
  supabase: CommunitySupabaseClient,
  rideId: string
): Promise<TripBooking[]> => {
  const { data, error } = await supabase
    .from('trip_bookings')
    .select(
      `
      *,
      passenger:profiles!trip_bookings_passenger_id_fkey (
        id, first_name, last_name, profile_photo_url, deleted_at
      )
    `
    )
    .eq('ride_id', rideId);

  if (error) throw error;
  return data as unknown as TripBooking[];
};

/**
 * Fetches trips I'm driving that have bookings.
 */
export const fetchMyDriverTrips = async (
  supabase: CommunitySupabaseClient,
  driverId: string
): Promise<TripBooking[]> => {
  // This fetches bookings, but maybe we want "Rides with their bookings"?
  // To keep it simple for the "Trips I'm Driving" list which focuses on bookings:
  const { data: bookings, error } = await supabase
    .from('trip_bookings')
    .select(
      `
      *,
      ride:rides (
        *
      )
    `
    )
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching driver trips:', JSON.stringify(error, null, 2));
    throw error;
  }

  if (!bookings || bookings.length === 0) return [];

  // Manual fetch for passenger profiles
  const passengerIds = Array.from(new Set(bookings.map((b) => b.passenger_id)));

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, profile_photo_url, deleted_at')
    .in('id', passengerIds);

  if (profilesError) {
    console.error('Error fetching passenger profiles for driver trips:', profilesError);
  }

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  const bookingsWithPassenger = bookings.map((booking) => ({
    ...booking,
    passenger: profileMap.get(booking.passenger_id) || {
      id: booking.passenger_id,
      first_name: 'Unknown',
      last_name: 'Passenger',
      profile_photo_url: null,
    },
  }));

  return bookingsWithPassenger as unknown as TripBooking[];
};

/**
 * Fetches trips I'm riding on (my bookings).
 */
export const fetchMyPassengerTrips = async (
  supabase: CommunitySupabaseClient,
  passengerId: string
): Promise<TripBooking[]> => {
  const { data: bookings, error } = await supabase
    .from('trip_bookings')
    .select(
      `
      *,
      ride:rides (
        *
      )
    `
    )
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching passenger trips:', JSON.stringify(error, null, 2));
    throw error;
  }

  if (!bookings || bookings.length === 0) return [];

  // Manual fetch for driver profiles to avoid alias collision issues (profiles_1.phone_number error)
  const driverIds = Array.from(new Set(bookings.map((b) => b.driver_id)));

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, profile_photo_url, deleted_at')
    .in('id', driverIds);

  if (profilesError) {
    console.error('Error fetching driver profiles for trips:', profilesError);
  }

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  const bookingsWithDriver = bookings.map((booking) => ({
    ...booking,
    driver: profileMap.get(booking.driver_id) || {
      id: booking.driver_id,
      first_name: 'Unknown',
      last_name: 'Driver',
      profile_photo_url: null,
    },
  }));

  return bookingsWithDriver as unknown as TripBooking[];
};
