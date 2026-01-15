import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { POST } from './route';
import { sendConversationMessage } from '@/lib/supabase/conversations';
import { getAuthenticatedUser, ensureProfileComplete } from '@/lib/supabase/auth';

jest.mock('@/lib/supabase/conversations', () => ({
  sendConversationMessage: jest.fn(),
}));

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
  ensureProfileComplete: jest.fn(),
}));

describe('POST /api/trips/bookings', () => {
  const ride = {
    id: 'a3c8e5a6-ec45-4e90-9f3b-52f4ef6ccebf',
    poster_id: 'driver-1',
    available_seats: 3,
    status: 'active',
    title: 'Snowy Ride',
    start_location: 'San Francisco',
    end_location: 'Tahoe',
  };

  const bookingResponse = {
    id: 'booking-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ensureProfileComplete as jest.Mock).mockResolvedValue(null);
  });

  it('creates a booking and notifies the driver via message', async () => {
    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'rides') {
          const single = jest.fn().mockResolvedValue({ data: ride, error: null });
          const eq = jest.fn().mockReturnValue({ single });
          return { select: jest.fn().mockReturnValue({ eq }) };
        }

        if (tableName === 'trip_bookings') {
          const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
          const eqSecond = jest.fn().mockReturnValue({ maybeSingle });
          const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond });
          const select = jest.fn().mockReturnValue({ eq: eqFirst });

          const insertSingle = jest.fn().mockResolvedValue({ data: bookingResponse, error: null });
          const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
          const insert = jest.fn().mockReturnValue({ select: insertSelect });
          return { select, insert };
        }

        if (tableName === 'profiles') {
          const maybeSingle = jest
            .fn()
            .mockResolvedValue({ data: { first_name: 'Alice', last_name: 'Test' }, error: null });
          const eq = jest.fn().mockReturnValue({ maybeSingle });
          return { select: jest.fn().mockReturnValue({ eq }) };
        }

        return { select: jest.fn(), insert: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: 'passenger-1' };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user,
      authError: null,
      supabase,
    });

    const requestBody = {
      ride_id: ride.id,
      pickup_location: 'Central',
      pickup_date: '2025-12-20',
      pickup_time: '08:00',
      passenger_notes: 'Excited to ride!',
    };

    const request = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest;

    await POST(request);

    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: ride.poster_id,
      rideId: requestBody.ride_id,
      content: expect.stringContaining('requested to join'),
    });
  });

  it('reopens a cancelled booking when re-requesting the same ride', async () => {
    const existingBooking = { id: 'booking-2', status: 'cancelled' };
    const reopenedBooking = {
      ...existingBooking,
      status: 'pending',
      pickup_location: 'Central',
    };

    const updateSingle = jest.fn().mockResolvedValue({ data: reopenedBooking, error: null });
    const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
    const update = jest.fn().mockReturnValue({ select: updateSelect });

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'rides') {
          const single = jest.fn().mockResolvedValue({ data: ride, error: null });
          const eq = jest.fn().mockReturnValue({ single });
          return { select: jest.fn().mockReturnValue({ eq }) };
        }

        if (tableName === 'trip_bookings') {
          const maybeSingle = jest.fn().mockResolvedValue({ data: existingBooking, error: null });
          const eqSecond = jest.fn().mockReturnValue({ maybeSingle });
          const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond });
          const select = jest.fn().mockReturnValue({ eq: eqFirst });

          return { select, update };
        }

        if (tableName === 'profiles') {
          const maybeSingle = jest
            .fn()
            .mockResolvedValue({ data: { first_name: 'Alice', last_name: 'Test' }, error: null });
          const eq = jest.fn().mockReturnValue({ maybeSingle });
          return { select: jest.fn().mockReturnValue({ eq }) };
        }

        return { select: jest.fn(), update: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: 'passenger-1' };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user,
      authError: null,
      supabase,
    });

    const requestBody = {
      ride_id: ride.id,
      pickup_location: 'Central',
      pickup_date: '2025-12-20',
      pickup_time: '08:00',
      passenger_notes: 'Trying again',
    };

    const request = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest;

    await POST(request);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        confirmed_at: null,
        pickup_location: requestBody.pickup_location,
        passenger_notes: requestBody.passenger_notes,
      })
    );
  });
});
