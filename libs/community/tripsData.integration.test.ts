/**
 * @jest-environment node
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { updateTripBooking } from './tripsData';
import type { TripBookingStatus } from '@/app/community/types';
import type { Database } from '@/types/database.types';

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replaceAll(/[xy]/g, function (c) {
    const r = Math.trunc(Math.random() * 16),
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

jest.setTimeout(30000);

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TEST_EMAIL_DOMAIN = '@example.com';

// Setup admin client for user creation only
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

describe('Trip Bookings Integration', () => {
  let driverId: string;
  let passengerId: string;
  let rideId: string;
  let bookingId: string;
  let driverClient: SupabaseClient<Database>;
  let passengerClient: SupabaseClient<Database>;

  const timestamp = Date.now();
  const driverEmail = `driver-${timestamp}${TEST_EMAIL_DOMAIN}`;
  const passengerEmail = `passenger-${timestamp}${TEST_EMAIL_DOMAIN}`;
  const password = 'TestPassword123!';

  beforeAll(async () => {
    // 1. Create Driver User
    const { data: driverAuth, error: driverCreateError } =
      await supabaseAdmin.auth.admin.createUser({
        email: driverEmail,
        password: password,
        email_confirm: true,
      });
    if (driverCreateError) throw driverCreateError;
    driverId = driverAuth.user.id;

    // 2. Create Passenger User
    const { data: passengerAuth, error: passengerCreateError } =
      await supabaseAdmin.auth.admin.createUser({
        email: passengerEmail,
        password: password,
        email_confirm: true,
      });
    if (passengerCreateError) throw passengerCreateError;
    passengerId = passengerAuth.user.id;

    // 3. Update Profiles
    await supabaseAdmin
      .from('profiles')
      .update({ first_name: 'Driver', last_name: 'Test', role: 'driver' })
      .eq('id', driverId);
    await supabaseAdmin
      .from('profiles')
      .update({ first_name: 'Passenger', last_name: 'Test', role: 'passenger' })
      .eq('id', passengerId);

    // 4. Sign In Driver
    const { data: driverSession } = await supabaseAdmin.auth.signInWithPassword({
      email: driverEmail,
      password,
    });
    driverClient = createClient<Database>(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${driverSession.session!.access_token}` } },
    });

    // 5. Sign In Passenger
    const { data: passengerSession } = await supabaseAdmin.auth.signInWithPassword({
      email: passengerEmail,
      password,
    });
    passengerClient = createClient<Database>(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${passengerSession.session!.access_token}` } },
    });

    // 6. Create Ride (as Driver)
    rideId = uuidv4();
    // Calculate tomorrow's date for a valid future ride
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { error: rideError } = await driverClient.from('rides').insert({
      id: rideId,
      poster_id: driverId,
      posting_type: 'driver',
      start_location: 'Reno',
      end_location: 'Truckee',
      departure_date: tomorrowStr,
      departure_time: '12:00:00',
      available_seats: 4,
      status: 'active',
    });
    if (rideError) throw rideError;
  });

  afterAll(async () => {
    // Cleanup users (cascade deletes profiles, rides, bookings)
    if (driverId) await supabaseAdmin.auth.admin.deleteUser(driverId);
    if (passengerId) await supabaseAdmin.auth.admin.deleteUser(passengerId);
  });

  it('should create an invited booking', async () => {
    // Simulate Driver Inviting Passenger
    bookingId = uuidv4();
    // Must use tomorrow's date combined with time for pickup_time logic if needed,
    // but simple ISO string works for timestamp types usually.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { error } = await driverClient.from('trip_bookings').insert({
      id: bookingId,
      ride_id: rideId,
      driver_id: driverId,
      passenger_id: passengerId,
      pickup_location: 'Reno',
      pickup_time: `${tomorrowStr}T12:00:00`,
      status: 'invited',
      driver_notes: 'Invitation from test',
    });

    expect(error).toBeNull();

    const { data: booking } = await driverClient
      .from('trip_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    expect(booking).toBeDefined();
    if (!booking) throw new Error('Booking not found');
    expect(booking.status).toBe('invited');
  });

  it('should allow passenger to accept invitation (update status)', async () => {
    const updateInput = {
      status: 'confirmed' as TripBookingStatus,
    };

    // Passenger accepts
    await updateTripBooking(passengerClient, bookingId, updateInput);

    const { data: booking } = await passengerClient
      .from('trip_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    expect(booking).toBeDefined();
    if (!booking) throw new Error('Booking not found');
    expect(booking.status).toBe('confirmed');
  });
});
