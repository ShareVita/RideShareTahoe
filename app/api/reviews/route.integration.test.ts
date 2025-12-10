/**
 * @jest-environment node
 */
/**
 * Integration Test: Reviews Flow
 *
 * This test verifies the review creation flow:
 * 1. Create Users (Driver, Passenger)
 * 2. Create Ride (Driver posts)
 * 3. Create Meeting (Passenger requests, Driver accepts, Meeting completes)
 * 4. Passenger reviews Driver
 * 5. Verify review exists
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { POST, GET } from './route';
import { GET as GET_PENDING } from './pending/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/libs/supabase/server';

// Mock the server client
jest.mock('@/libs/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Test configuration
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'null' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== ''
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : 'http://127.0.0.1:54321';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== 'null'
    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    : 'test-anon-key';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== 'undefined' &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== 'null'
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Integration tests requiring admin access will fail.'
  );
}
const TEST_EMAIL_DOMAIN = '@example.com';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface PendingReviewResponse {
  booking_id: string;
  other_participant_id: string;
  [key: string]: unknown;
}

// Skip this test if not in integration test mode
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = isIntegrationTest ? describe : describe.skip;

describeIntegration('Reviews API Integration Test', () => {
  let supabaseAdmin: SupabaseClient<Database>;
  let driverId: string;
  let passengerId: string;
  let driverEmail: string;
  let passengerEmail: string;
  let rideId: string;
  let bookingId: string;
  beforeAll(async () => {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing. Cannot run integration tests.');
    }
    supabaseAdmin = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const timestamp = Date.now();
    driverEmail = `driver-${timestamp}${TEST_EMAIL_DOMAIN}`;
    passengerEmail = `passenger-${timestamp}${TEST_EMAIL_DOMAIN}`;
  });

  afterAll(async () => {
    // Cleanup
    if (driverId) await supabaseAdmin.auth.admin.deleteUser(driverId);
    if (passengerId) await supabaseAdmin.auth.admin.deleteUser(passengerId);
  });

  it('should setup test users and ride', async () => {
    // 1. Create Driver
    const { data: driverAuth, error: createDriverError } =
      await supabaseAdmin.auth.admin.createUser({
        email: driverEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });
    if (createDriverError) throw createDriverError;
    driverId = driverAuth.user.id;

    // Update Driver Profile to ensure firstName is set (required for reviews)
    await supabaseAdmin
      .from('profiles')
      .update({ first_name: 'Driver', last_name: 'Integration' })
      .eq('id', driverId);

    // 2. Create Passenger
    const { data: passengerAuth, error: createPassengerError } =
      await supabaseAdmin.auth.admin.createUser({
        email: passengerEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });
    if (createPassengerError) throw createPassengerError;
    passengerId = passengerAuth.user.id;

    // Update Passenger Profile to ensure firstName is set (required for reviews)
    await supabaseAdmin
      .from('profiles')
      .update({ first_name: 'Passenger', last_name: 'Integration' })
      .eq('id', passengerId);

    // Login as Driver to create Ride (RLS)
    const { data: driverSession } = await supabaseAdmin.auth.signInWithPassword({
      email: driverEmail,
      password: 'TestPassword123!',
    });
    const driverClient = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${driverSession.session!.access_token}` } },
    });

    // 3. Create Ride (Driver)
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() - 2);
    const [departureDateString, departureTimeStringWithTZ] = departureDate.toISOString().split('T');
    const departureTimeString = departureTimeStringWithTZ.split('.')[0];

    const { data: ride, error: rideError } = await driverClient
      .from('rides')
      .insert({
        poster_id: driverId,
        posting_type: 'driver',
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        departure_date: departureDateString,
        departure_time: departureTimeString,
        status: 'active',
        total_seats: 3,
        available_seats: 3,
        price_per_seat: 50,
      })
      .select()
      .single();

    if (rideError) console.error('Ride creation error:', rideError);
    expect(rideError).toBeNull();
    rideId = ride!.id;

    // 4. Create Completed Meeting (Past)
    // Login as Passenger to create Meeting request
    const { data: passengerSession } = await supabaseAdmin.auth.signInWithPassword({
      email: passengerEmail,
      password: 'TestPassword123!',
    });
    const passengerClient = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${passengerSession.session!.access_token}` } },
    });

    const bookingStart = new Date();
    bookingStart.setDate(bookingStart.getDate() - 1);
    const pickupTime = bookingStart.toISOString();

    const { data: booking, error: bookingError } = await passengerClient
      .from('trip_bookings')
      .insert({
        ride_id: rideId,
        driver_id: driverId,
        passenger_id: passengerId,
        pickup_location: 'San Francisco',
        pickup_time: pickupTime,
        status: 'completed',
        driver_notes: 'Integration test booking',
      })
      .select()
      .single();

    if (bookingError) console.error('Booking creation error:', bookingError);
    if (bookingError) console.error('Booking creation error:', bookingError);
    expect(bookingError).toBeNull();
    bookingId = booking!.id;
  });
  it('should list pending reviews for Passenger', async () => {
    // Login as Passenger
    const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
      email: passengerEmail,
      password: 'TestPassword123!',
    });
    const accessToken = sessionData.session!.access_token;

    // Mock createClient
    (createClient as jest.Mock).mockResolvedValue(
      createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      })
    );

    const req = new NextRequest(`${BASE_URL}/api/reviews/pending`);
    const response = await GET_PENDING(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pendingReviews).toBeDefined();
    const pendingReview = data.pendingReviews.find(
      (review: PendingReviewResponse) => review.booking_id === bookingId
    );

    // Check for the specific meeting
    expect(pendingReview).toBeDefined();
    expect(pendingReview.other_participant_id).toBe(driverId);
  });

  it('should allow Passenger to review Driver', async () => {
    // Login as Passenger
    const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
      email: passengerEmail,
      password: 'TestPassword123!',
    });

    const accessToken = sessionData.session!.access_token;

    // Mock createClient to return an authenticated client for this user
    (createClient as jest.Mock).mockResolvedValue(
      createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      })
    );
    const req = new NextRequest(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        bookingId: bookingId,
      },
      body: JSON.stringify({
        bookingId: bookingId,
        rating: 5,
        comment: 'Great driver, very safe, and on time!',
      }),
    });

    const response = await POST(req);

    if (response.status !== 200) {
      const data = await response.json();
      console.error('Review API Error Data:', data);
    }

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.review).toBeDefined();
    expect(data.review.rating).toBe(5);
    expect(data.review.reviewer_id).toBe(passengerId);
    expect(data.review.reviewee_id).toBe(driverId);
  });

  it('should deny review from non-participant', async () => {
    // Create random user
    const randomEmail = `random-${Date.now()}${TEST_EMAIL_DOMAIN}`;
    const { data: randomAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: randomEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    if (createError) throw createError;
    const randomId = randomAuth.user.id;

    // Update Random User Profile to pass the profile check, so we can test the 404/403 booking check
    await supabaseAdmin
      .from('profiles')
      .update({ first_name: 'Random', last_name: 'User' })
      .eq('id', randomId);

    // Login
    const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
      email: randomEmail,
      password: 'TestPassword123!',
    });
    const accessToken = sessionData.session!.access_token;

    // Mock createClient
    (createClient as jest.Mock).mockResolvedValue(
      createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      })
    );

    const req = new NextRequest(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        bookingId: bookingId,
      },
      body: JSON.stringify({
        bookingId: bookingId,
        rating: 1,
        comment: 'I was not there but I want to complain!',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);

    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(randomId);
  });

  it('should fetch reviews for Driver', async () => {
    // Login as anyone (e.g. Passenger again)
    const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
      email: passengerEmail,
      password: 'TestPassword123!',
    });
    const accessToken = sessionData.session!.access_token;

    // Mock createClient to return an authenticated client for this user
    (createClient as jest.Mock).mockResolvedValue(
      createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      })
    );

    const req = new NextRequest(`${BASE_URL}/api/reviews?userId=${driverId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reviews.length).toBeGreaterThan(0);
    expect(data.reviews[0].reviewee_id).toBe(driverId);
  });
});
