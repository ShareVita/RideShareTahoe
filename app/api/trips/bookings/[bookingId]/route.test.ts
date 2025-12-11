import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { PATCH } from './route';
import { getAuthenticatedUser, ensureProfileComplete } from '@/libs/supabase/auth';
import { sendConversationMessage } from '@/libs/supabase/conversations';

jest.mock('@/libs/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
  ensureProfileComplete: jest.fn(),
}));

jest.mock('@/libs/supabase/conversations', () => ({
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

  it('allows driver to deny their own invitation and sends appropriate message', async () => {
    const bookingId = 'booking-invited';
    const bookingRow = {
      id: bookingId,
      ride_id: 'ride-3',
      driver_id: 'driver-3',
      passenger_id: 'passenger-3',
      status: 'invited',
      pickup_location: 'Central Station',
      pickup_time: '2025-12-27T10:00:00Z',
      ride: {
        id: 'ride-3',
        title: 'Weekend Trip',
        start_location: 'Reno',
        end_location: 'Tahoe',
        departure_date: '2025-12-27',
        departure_time: '10:00',
        available_seats: 3,
      },
      driver: { first_name: 'Driver', last_name: 'Three' },
      passenger: { first_name: 'Rider', last_name: 'Three' },
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

    const user = { id: bookingRow.driver_id };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      url: `https://example.com/api/trips/bookings/${bookingId}`,
      json: jest.fn().mockResolvedValue({ action: 'deny' }),
    } as unknown as NextRequest;

    await PATCH(request, { params: Promise.resolve({ bookingId }) });

    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: bookingRow.passenger_id,
      rideId: bookingRow.ride_id,
      content: expect.stringContaining('cancelled the invitation'),
    });
  });

  it('allows passenger to deny an invitation and sends appropriate message', async () => {
    const bookingId = 'booking-invited-deny';
    const bookingRow = {
      id: bookingId,
      ride_id: 'ride-4',
      driver_id: 'driver-4',
      passenger_id: 'passenger-4',
      status: 'invited',
      pickup_location: 'Bus Stop',
      pickup_time: '2025-12-28T11:00:00Z',
      ride: {
        id: 'ride-4',
        title: 'Daily Commute',
        start_location: 'Carson City',
        end_location: 'Tahoe',
        departure_date: '2025-12-28',
        departure_time: '11:00',
        available_seats: 2,
      },
      driver: { first_name: 'Driver', last_name: 'Four' },
      passenger: { first_name: 'Rider', last_name: 'Four' },
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
      json: jest.fn().mockResolvedValue({ action: 'deny' }),
    } as unknown as NextRequest;

    await PATCH(request, { params: Promise.resolve({ bookingId }) });

    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: bookingRow.driver_id,
      rideId: bookingRow.ride_id,
      content: expect.stringContaining('declined the invitation'),
    });
  });
});
