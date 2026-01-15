import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { PATCH } from './route';
import { getAuthenticatedUser, ensureProfileComplete } from '@/lib/supabase/auth';
import { sendConversationMessage } from '@/lib/supabase/conversations';

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
  ensureProfileComplete: jest.fn(),
}));

jest.mock('@/lib/supabase/conversations', () => ({
  sendConversationMessage: jest.fn(),
}));

describe('PATCH /api/trips/bookings/[bookingId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureProfileComplete as jest.Mock).mockResolvedValue(null);
  });

  it('confirms a pending booking and notifies the passenger', async () => {
    const bookingId = 'booking-abc';
    const ride = {
      id: 'ride-1',
      title: 'Mountain Run',
      start_location: 'Oakland',
      end_location: 'Tahoe',
      departure_date: '2025-12-25',
      departure_time: '09:15',
      available_seats: 2,
    };

    const bookingRow = {
      id: bookingId,
      driver_id: 'driver-1',
      passenger_id: 'passenger-1',
      status: 'pending',
      pickup_location: 'Downtown',
      pickup_time: '2025-12-25T09:15:00Z',
      ride_id: ride.id,
      ride,
      driver: { first_name: 'Driver', last_name: 'Test' },
      passenger: { first_name: 'Rider', last_name: 'Guest' },
    };

    const rideUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const rideUpdate = jest.fn().mockReturnValue({ eq: rideUpdateEq });

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'trip_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: bookingRow, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (tableName === 'rides') {
          return { update: rideUpdate };
        }
        return { select: jest.fn(), update: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: 'driver-1' };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      url: `https://example.com/api/trips/bookings/${bookingId}`,
      json: jest.fn().mockResolvedValue({ action: 'approve' }),
    } as unknown as NextRequest;

    await PATCH(request, { params: Promise.resolve({ bookingId }) });

    expect(rideUpdate).toHaveBeenCalledWith({ available_seats: 1 });
    expect(rideUpdateEq).toHaveBeenCalledWith('id', ride.id);
    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: bookingRow.passenger_id,
      rideId: bookingRow.ride_id,
      content: expect.stringContaining('confirmed'),
    });
  });

  it('cancels a pending request and notifies the driver', async () => {
    const bookingId = 'booking-cancel';
    const bookingRow = {
      id: bookingId,
      ride_id: 'ride-2',
      driver_id: 'driver-2',
      passenger_id: 'passenger-2',
      status: 'pending',
      pickup_location: 'Uptown',
      pickup_time: '2025-12-26T08:30:00Z',
      ride: {
        id: 'ride-2',
        title: 'Valley Shuttle',
        start_location: 'Sacramento',
        end_location: 'Tahoe',
        departure_date: '2025-12-26',
        departure_time: '08:30',
        available_seats: 2,
      },
      driver: { first_name: 'Driver', last_name: 'Two' },
      passenger: { first_name: 'Rider', last_name: 'Two' },
    };

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'trip_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: bookingRow, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        return { select: jest.fn(), update: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: bookingRow.passenger_id };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      url: `https://example.com/api/trips/bookings/${bookingId}`,
      json: jest.fn().mockResolvedValue({ action: 'cancel' }),
    } as unknown as NextRequest;

    await PATCH(request, { params: Promise.resolve({ bookingId }) });

    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: bookingRow.driver_id,
      rideId: bookingRow.ride_id,
      content: expect.stringContaining('cancelled my request'),
    });
  });

  it('derives booking id from the request URL when params are missing', async () => {
    const bookingId = 'booking-fallback';
    const bookingRow = {
      id: bookingId,
      driver_id: 'driver-42',
      passenger_id: 'passenger-42',
      status: 'pending',
      pickup_location: 'Outskirts',
      pickup_time: '2025-12-26T08:30:00Z',
      ride_id: 'ride-42',
      ride: {
        id: 'ride-42',
        title: 'Lake Loop',
        start_location: 'A',
        end_location: 'B',
        departure_date: '2025-12-26',
        departure_time: '08:30',
        available_seats: 1,
      },
      driver: { first_name: 'Driver', last_name: 'FourtyTwo' },
      passenger: { first_name: 'Passenger', last_name: 'FourtyTwo' },
    };

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'trip_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: bookingRow, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (tableName === 'rides') {
          return {
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        return { select: jest.fn(), update: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: bookingRow.driver_id };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      url: `https://example.com/api/trips/bookings/${bookingId}`,
      json: jest.fn().mockResolvedValue({ action: 'approve' }),
    } as unknown as NextRequest;

    await PATCH(request, { params: Promise.resolve({ bookingId: '' }) });

    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: bookingRow.passenger_id,
      rideId: bookingRow.ride_id,
      content: expect.stringContaining('confirmed'),
    });
  });

  it('does not decrement seats when passenger accepts invitation (already decremented on creation)', async () => {
    const bookingId = 'booking-invitation';
    const ride = {
      id: 'ride-3',
      title: 'Ski Trip',
      start_location: 'San Jose',
      end_location: 'Tahoe',
      departure_date: '2025-12-30',
      departure_time: '07:00',
      available_seats: 2, // Already decremented when invitation was created
    };

    const bookingRow = {
      id: bookingId,
      driver_id: 'driver-3',
      passenger_id: 'passenger-3',
      status: 'invited',
      pickup_location: 'Downtown San Jose',
      pickup_time: '2025-12-30T07:00:00Z',
      ride_id: ride.id,
      ride,
      driver: { first_name: 'Alice', last_name: 'Driver' },
      passenger: { first_name: 'Bob', last_name: 'Passenger' },
    };

    const rideUpdate = jest.fn();

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'trip_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: bookingRow, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (tableName === 'rides') {
          return { update: rideUpdate };
        }
        return { select: jest.fn(), update: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: bookingRow.passenger_id };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      url: `https://example.com/api/trips/bookings/${bookingId}`,
      json: jest.fn().mockResolvedValue({ action: 'approve' }),
    } as unknown as NextRequest;

    await PATCH(request, { params: Promise.resolve({ bookingId }) });

    // Seats should NOT be decremented because they were already decremented when invitation was created
    expect(rideUpdate).not.toHaveBeenCalled();
    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: bookingRow.driver_id,
      rideId: bookingRow.ride_id,
      content: expect.stringContaining('accepted the invite'),
    });
  });

  it('restores seat when passenger denies an invitation', async () => {
    const bookingId = 'booking-deny-invitation';
    const ride = {
      id: 'ride-4',
      title: 'Beach Trip',
      start_location: 'SF',
      end_location: 'Santa Cruz',
      departure_date: '2025-12-28',
      departure_time: '10:00',
      available_seats: 1, // Was decremented to 1 when invitation was created
    };

    const bookingRow = {
      id: bookingId,
      driver_id: 'driver-4',
      passenger_id: 'passenger-4',
      status: 'invited',
      pickup_location: 'Downtown SF',
      pickup_time: '2025-12-28T10:00:00Z',
      ride_id: ride.id,
      ride,
      driver: { first_name: 'Charlie', last_name: 'Driver' },
      passenger: { first_name: 'Dana', last_name: 'Passenger' },
    };

    const rideUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const rideUpdate = jest.fn().mockReturnValue({ eq: rideUpdateEq });

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'trip_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: bookingRow, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (tableName === 'rides') {
          return { update: rideUpdate };
        }
        return { select: jest.fn(), update: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: bookingRow.passenger_id };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      url: `https://example.com/api/trips/bookings/${bookingId}`,
      json: jest.fn().mockResolvedValue({ action: 'deny' }),
    } as unknown as NextRequest;

    await PATCH(request, { params: Promise.resolve({ bookingId }) });

    // Seat should be restored (incremented) because it was decremented when invitation was created
    expect(rideUpdate).toHaveBeenCalledWith({ available_seats: 2 });
    expect(rideUpdateEq).toHaveBeenCalledWith('id', ride.id);
    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: bookingRow.driver_id,
      rideId: bookingRow.ride_id,
      content: expect.stringContaining('declined the invitation'),
    });
  });

  it('handles unlimited seats (null) when accepting invitation', async () => {
    const bookingId = 'booking-unlimited';
    const ride = {
      id: 'ride-5',
      title: 'Bus Trip',
      start_location: 'Oakland',
      end_location: 'Reno',
      departure_date: '2025-12-31',
      departure_time: '06:00',
      available_seats: null,
    };

    const bookingRow = {
      id: bookingId,
      driver_id: 'driver-5',
      passenger_id: 'passenger-5',
      status: 'invited',
      pickup_location: 'Downtown Oakland',
      pickup_time: '2025-12-31T06:00:00Z',
      ride_id: ride.id,
      ride,
      driver: { first_name: 'Eve', last_name: 'Driver' },
      passenger: { first_name: 'Frank', last_name: 'Passenger' },
    };

    const rideUpdate = jest.fn();

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'trip_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: bookingRow, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (tableName === 'rides') {
          return { update: rideUpdate };
        }
        return { select: jest.fn(), update: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: bookingRow.passenger_id };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      url: `https://example.com/api/trips/bookings/${bookingId}`,
      json: jest.fn().mockResolvedValue({ action: 'approve' }),
    } as unknown as NextRequest;

    await PATCH(request, { params: Promise.resolve({ bookingId }) });

    expect(rideUpdate).not.toHaveBeenCalled();
    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: bookingRow.driver_id,
      rideId: bookingRow.ride_id,
      content: expect.stringContaining('accepted the invite'),
    });
  });
});
