/**
 * @jest-environment node
 */
/**
 * Integration Test: Rides Display and Filtering
 *
 * This test verifies the ride post visibility and filtering logic:
 * 1. Create Users (Driver, Passenger)
 * 2. Create Rides (Different posting types and dates)
 * 3. Verify fetchAllRides excludes current user's posts
 * 4. Verify filtering by posting_type
 * 5. Verify date filtering (only future rides)
 * 6. Verify round trip posts
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  fetchAllRides,
  fetchDriverRides,
  fetchPassengerRides,
  fetchMyRides,
} from '@/libs/community/ridesData';
import type { RidePostType } from '@/app/community/types';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TEST_EMAIL_DOMAIN = '@example.com';

// Skip this test if not in integration test mode
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = isIntegrationTest ? describe : describe.skip;

describeIntegration('Rides Display Integration Test', () => {
  let supabaseAdmin: ReturnType<typeof createSupabaseClient>;
  let user1Id: string;
  let user2Id: string;
  let user1Email: string;
  let user2Email: string;
  let user1Client: ReturnType<typeof createSupabaseClient>;
  let user2Client: ReturnType<typeof createSupabaseClient>;
  let user1DriverRideId: string;
  let user1PassengerRideId: string;
  let user2DriverRideId: string;
  let pastRideId: string;
  let roundTripGroupId: string;

  const locationCoordinates = {
    sanFrancisco: { lat: 37.7749, lng: -122.4194 },
    lakeTahoe: { lat: 39.0968, lng: -120.0324 },
    oakland: { lat: 37.8044, lng: -122.2711 },
    southLakeTahoe: { lat: 38.9399, lng: -119.9772 },
    berkeley: { lat: 37.8715, lng: -122.273 },
    truckee: { lat: 39.327, lng: -120.183 },
    paloAlto: { lat: 37.4419, lng: -122.143 },
    heavenly: { lat: 38.9605, lng: -119.9355 },
    sanJose: { lat: 37.3382, lng: -121.8863 },
    northstar: { lat: 39.2114, lng: -120.0817 },
  };

  const collectAllRides = async (
    client: ReturnType<typeof createSupabaseClient>,
    profile: { id: string; first_name: string; last_name: string },
    pageSize = 100,
    maxPages = 20
  ) => {
    const rides: RidePostType[] = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const response = await fetchAllRides(client, profile, page, pageSize);
      rides.push(...response.rides);
      if (!response.hasMore) {
        break;
      }
    }
    return rides;
  };

  beforeAll(async () => {
    supabaseAdmin = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const timestamp = Date.now();
    user1Email = `user1-${timestamp}${TEST_EMAIL_DOMAIN}`;
    user2Email = `user2-${timestamp}${TEST_EMAIL_DOMAIN}`;
  });

  afterAll(async () => {
    // Cleanup
    if (user1Id) await supabaseAdmin.auth.admin.deleteUser(user1Id);
    if (user2Id) await supabaseAdmin.auth.admin.deleteUser(user2Id);
  });

  it('should setup test users and rides', async () => {
    // Create User 1
    const { data: user1Auth, error: createError1 } = await supabaseAdmin.auth.admin.createUser({
      email: user1Email,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    if (createError1) throw createError1;
    user1Id = user1Auth.user.id;

    // Create User 2
    const { data: user2Auth, error: createError2 } = await supabaseAdmin.auth.admin.createUser({
      email: user2Email,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    if (createError2) throw createError2;
    user2Id = user2Auth.user.id;

    // Update profiles with required fields
    await supabaseAdmin
      .from('profiles')
      .update({ first_name: 'User', last_name: 'One' } as never)
      .eq('id', user1Id);

    await supabaseAdmin
      .from('profiles')
      .update({ first_name: 'User', last_name: 'Two' } as never)
      .eq('id', user2Id);

    // Login as User 1
    const { data: user1Session } = await supabaseAdmin.auth.signInWithPassword({
      email: user1Email,
      password: 'TestPassword123!',
    });
    user1Client = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${user1Session.session!.access_token}` } },
    });

    // Login as User 2
    const { data: user2Session } = await supabaseAdmin.auth.signInWithPassword({
      email: user2Email,
      password: 'TestPassword123!',
    });
    user2Client = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${user2Session.session!.access_token}` } },
    });

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // User 1 creates a driver post
    const { data: user1DriverRide, error: error1 } = (await user1Client
      .from('rides')
      .insert({
        poster_id: user1Id,
        posting_type: 'driver',
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        start_lat: locationCoordinates.sanFrancisco.lat,
        start_lng: locationCoordinates.sanFrancisco.lng,
        end_lat: locationCoordinates.lakeTahoe.lat,
        end_lng: locationCoordinates.lakeTahoe.lng,
        departure_date: tomorrowStr,
        departure_time: '08:00:00',
        status: 'active',
        total_seats: 3,
        available_seats: 3,
        price_per_seat: 50,
      } as never)
      .select()
      .single()) as { data: { id: string } | null; error: unknown };

    expect(error1).toBeNull();
    user1DriverRideId = user1DriverRide!.id;

    // User 1 creates a passenger post
    const { data: user1PassengerRide, error: error2 } = (await user1Client
      .from('rides')
      .insert({
        poster_id: user1Id,
        posting_type: 'passenger',
        start_location: 'Oakland',
        end_location: 'South Lake Tahoe',
        start_lat: locationCoordinates.oakland.lat,
        start_lng: locationCoordinates.oakland.lng,
        end_lat: locationCoordinates.southLakeTahoe.lat,
        end_lng: locationCoordinates.southLakeTahoe.lng,
        departure_date: tomorrowStr,
        departure_time: '09:00:00',
        status: 'active',
      } as never)
      .select()
      .single()) as { data: { id: string } | null; error: unknown };

    expect(error2).toBeNull();
    user1PassengerRideId = user1PassengerRide!.id;

    // User 2 creates a driver post
    const { data: user2DriverRide, error: error3 } = (await user2Client
      .from('rides')
      .insert({
        poster_id: user2Id,
        posting_type: 'driver',
        start_location: 'Berkeley',
        end_location: 'Truckee',
        start_lat: locationCoordinates.berkeley.lat,
        start_lng: locationCoordinates.berkeley.lng,
        end_lat: locationCoordinates.truckee.lat,
        end_lng: locationCoordinates.truckee.lng,
        departure_date: tomorrowStr,
        departure_time: '10:00:00',
        status: 'active',
        total_seats: 4,
        available_seats: 2,
        price_per_seat: 40,
      } as never)
      .select()
      .single()) as { data: { id: string } | null; error: unknown };

    expect(error3).toBeNull();
    user2DriverRideId = user2DriverRide!.id;

    // Create a past ride (should not appear in results)
    const { data: pastRide, error: error4 } = (await user2Client
      .from('rides')
      .insert({
        poster_id: user2Id,
        posting_type: 'driver',
        start_location: 'Palo Alto',
        end_location: 'Heavenly',
        start_lat: locationCoordinates.paloAlto.lat,
        start_lng: locationCoordinates.paloAlto.lng,
        end_lat: locationCoordinates.heavenly.lat,
        end_lng: locationCoordinates.heavenly.lng,
        departure_date: yesterdayStr,
        departure_time: '07:00:00',
        status: 'active',
        total_seats: 3,
        available_seats: 1,
        price_per_seat: 60,
      } as never)
      .select()
      .single()) as { data: { id: string } | null; error: unknown };

    expect(error4).toBeNull();
    pastRideId = pastRide!.id;

    const uuidv4 = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replaceAll(/[xy]/g, function (c) {
        const r = Math.trunc(Math.random() * 16),
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    // Create a round trip (two rides with shared round_trip_group_id)
    roundTripGroupId = uuidv4();
    const inOneWeek = new Date();
    inOneWeek.setDate(inOneWeek.getDate() + 7);
    const inOneWeekStr = inOneWeek.toISOString().split('T')[0];

    // Outbound leg
    const { error: rtError1 } = await user2Client.from('rides').insert({
      poster_id: user2Id,
      posting_type: 'driver',
      start_location: 'San Jose',
      end_location: 'Northstar',
      start_lat: locationCoordinates.sanJose.lat,
      start_lng: locationCoordinates.sanJose.lng,
      end_lat: locationCoordinates.northstar.lat,
      end_lng: locationCoordinates.northstar.lng,
      departure_date: inOneWeekStr,
      departure_time: '06:00:00',
      status: 'active',
      total_seats: 4,
      available_seats: 4,
      price_per_seat: 55,
      is_round_trip: true,
      trip_direction: 'departure',
      round_trip_group_id: roundTripGroupId,
    } as never);
    if (rtError1) throw new Error(`RT1 failed: ${JSON.stringify(rtError1)}`);

    // Return leg
    const { error: rtError2 } = await user2Client.from('rides').insert({
      poster_id: user2Id,
      posting_type: 'driver',
      start_location: 'Northstar',
      end_location: 'San Jose',
      start_lat: locationCoordinates.northstar.lat,
      start_lng: locationCoordinates.northstar.lng,
      end_lat: locationCoordinates.sanJose.lat,
      end_lng: locationCoordinates.sanJose.lng,
      departure_date: inOneWeekStr,
      departure_time: '17:00:00',
      status: 'active',
      total_seats: 4,
      available_seats: 4,
      price_per_seat: 55,
      is_round_trip: true,
      trip_direction: 'return',
      round_trip_group_id: roundTripGroupId,
    } as never);
    if (rtError2) throw new Error(`RT2 failed: ${JSON.stringify(rtError2)}`);
  });

  it('should exclude current user posts from fetchAllRides', async () => {
    const user1Profile = {
      id: user1Id,
      first_name: 'User',
      last_name: 'One',
    };

    const allRides = await collectAllRides(user1Client, user1Profile, 100);

    const user1PostIds = new Set([user1DriverRideId, user1PassengerRideId]);
    const foundOwnPost = allRides.some((ride) => user1PostIds.has(ride.id));
    expect(foundOwnPost).toBe(false);

    const foundUser2Post = allRides.some((ride) => ride.poster_id === user2Id);
    expect(foundUser2Post).toBe(true);

    const foundPastRide = allRides.some((ride) => ride.id === pastRideId);
    expect(foundPastRide).toBe(false);
  });

  it('should filter by posting_type=driver in fetchDriverRides', async () => {
    const user1Profile = {
      id: user1Id,
      first_name: 'User',
      last_name: 'One',
    };

    const driverRides = await fetchDriverRides(user1Client, user1Profile);

    // Should only contain driver posts
    const allAreDrivers = driverRides.every((ride) => ride.posting_type === 'driver');
    expect(allAreDrivers).toBe(true);

    // Should not contain User 1's own driver post
    const foundOwnPost = driverRides.some((ride) => ride.id === user1DriverRideId);
    expect(foundOwnPost).toBe(false);

    // Should contain User 2's driver post
    const foundUser2Post = driverRides.some((ride) => ride.id === user2DriverRideId);
    expect(foundUser2Post).toBe(true);

    // Should not contain passenger posts
    const foundPassengerPost = driverRides.some((ride) => ride.id === user1PassengerRideId);
    expect(foundPassengerPost).toBe(false);
  });

  it('should filter by posting_type=passenger in fetchPassengerRides', async () => {
    const user2Profile = {
      id: user2Id,
      first_name: 'User',
      last_name: 'Two',
    };

    const passengerResults = await fetchPassengerRides(user2Client, user2Profile, {
      page: 1,
      pageSize: 20,
      departureFilter: {
        lat: locationCoordinates.oakland.lat,
        lng: locationCoordinates.oakland.lng,
        radius: 5,
      },
    });
    const passengerRides = passengerResults.rides;

    // Should only contain passenger posts
    const allArePassengers = passengerRides.every((ride) => ride.posting_type === 'passenger');
    expect(allArePassengers).toBe(true);

    // Should contain User 1's passenger post
    const foundUser1Post = passengerRides.some((ride) => ride.id === user1PassengerRideId);
    expect(foundUser1Post).toBe(true);

    // Should not contain driver posts
    const foundDriverPost = passengerRides.some(
      (ride) => ride.id === user1DriverRideId || ride.id === user2DriverRideId
    );
    expect(foundDriverPost).toBe(false);
  });

  it('should return only user own posts in fetchMyRides', async () => {
    const user1Profile = {
      id: user1Id,
      first_name: 'User',
      last_name: 'One',
    };

    const myRides = await fetchMyRides(user1Client, user1Profile);

    // Should only contain User 1's posts
    const allAreUser1Posts = myRides.every((ride) => ride.poster_id === user1Id);
    expect(allAreUser1Posts).toBe(true);

    // Should contain both driver and passenger posts
    const foundDriverPost = myRides.some((ride) => ride.id === user1DriverRideId);
    const foundPassengerPost = myRides.some((ride) => ride.id === user1PassengerRideId);
    expect(foundDriverPost).toBe(true);
    expect(foundPassengerPost).toBe(true);

    // Should NOT contain User 2's posts
    const foundUser2Post = myRides.some((ride) => ride.poster_id === user2Id);
    expect(foundUser2Post).toBe(false);
  });

  it('should include round trip posts with proper grouping', async () => {
    const user1Profile = {
      id: user1Id,
      first_name: 'User',
      last_name: 'One',
    };

    const allRides = await collectAllRides(user1Client, user1Profile, 100);

    const roundTripRides = allRides.filter((ride) => ride.round_trip_group_id === roundTripGroupId);

    // Should have 2 rides (departure and return)
    expect(roundTripRides.length).toBe(2);

    // Should have one departure and one return
    const hasDeparture = roundTripRides.some((ride) => ride.trip_direction === 'departure');
    const hasReturn = roundTripRides.some((ride) => ride.trip_direction === 'return');
    expect(hasDeparture).toBe(true);
    expect(hasReturn).toBe(true);

    // Both should have is_round_trip = true
    const allAreRoundTrip = roundTripRides.every((ride) => ride.is_round_trip === true);
    expect(allAreRoundTrip).toBe(true);
  });

  it('should only return active status rides', async () => {
    // Create an inactive ride
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: inactiveRide } = (await user2Client
      .from('rides')
      .insert({
        poster_id: user2Id,
        posting_type: 'driver',
        start_location: 'Test City',
        end_location: 'Test Destination',
        departure_date: tomorrowStr,
        departure_time: '12:00:00',
        status: 'cancelled',
        total_seats: 3,
        available_seats: 3,
      } as never)
      .select()
      .single()) as { data: { id: string } | null; error: unknown };

    const user1Profile = {
      id: user1Id,
      first_name: 'User',
      last_name: 'One',
    };

    const result = await fetchAllRides(user1Client, user1Profile, 1, 20);

    // Should not contain the cancelled ride
    const foundInactiveRide = result.rides.some((ride) => ride.id === inactiveRide!.id);
    expect(foundInactiveRide).toBe(false);

    // All rides should have status='active'
    const allAreActive = result.rides.every((ride) => ride.status === 'active');
    expect(allAreActive).toBe(true);
  });

  it('should properly join owner profile data', async () => {
    const user1Profile = {
      id: user1Id,
      first_name: 'User',
      last_name: 'One',
    };

    const allRides = await collectAllRides(user1Client, user1Profile, 100);

    const user2Ride = allRides.find((ride) => ride.id === user2DriverRideId);
    expect(user2Ride).toBeDefined();
    expect(user2Ride?.owner).not.toBeNull();
    expect(user2Ride?.owner?.first_name).toBe('User');
    expect(user2Ride?.owner?.last_name).toBe('Two');
  });
});
