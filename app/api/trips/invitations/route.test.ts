import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { POST } from './route';
import { getAuthenticatedUser, ensureProfileComplete } from '@/libs/supabase/auth';
import { sendConversationMessage } from '@/libs/supabase/conversations';

jest.mock('@/libs/supabase/conversations', () => ({
  sendConversationMessage: jest.fn(),
}));

jest.mock('@/libs/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
  ensureProfileComplete: jest.fn(),
}));

describe('POST /api/trips/invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureProfileComplete as jest.Mock).mockResolvedValue(null);
  });

  it('creates an invitation and notifies the passenger', async () => {
    const ride = {
      poster_id: 'driver-idd',
      available_seats: 2,
      status: 'active',
      title: 'Mountain Ride',
      start_location: 'SF',
      end_location: 'Tahoe',
      departure_date: '2025-12-20',
      departure_time: '08:30',
    };

    const rideUpdateGt = jest.fn().mockResolvedValue({ error: null });
    const rideUpdateEq = jest.fn().mockReturnValue({ gt: rideUpdateGt });
    const rideUpdate = jest.fn().mockReturnValue({ eq: rideUpdateEq });

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'rides') {
          const single = jest.fn().mockResolvedValue({ data: ride, error: null });
          const eq = jest.fn().mockReturnValue({ single });
          return { select: jest.fn().mockReturnValue({ eq }), update: rideUpdate };
        }

        if (tableName === 'trip_bookings') {
          const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
          const inChain = jest.fn().mockReturnValue({ maybeSingle });
          const eqSecond = jest.fn().mockReturnValue({ in: inChain });
          const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond });
          const select = jest.fn().mockReturnValue({ eq: eqFirst });
          const deleteEq = jest.fn().mockResolvedValue({ error: null });
          const deleteChain = jest.fn().mockReturnValue({ eq: deleteEq });
          const insert = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'booking-xx' }, error: null }),
            }),
          });
          return { select, insert, delete: deleteChain };
        }

        if (tableName === 'profiles') {
          const maybeSingle = jest
            .fn()
            .mockResolvedValue({ data: { first_name: 'Driver', last_name: 'Test' }, error: null });
          const eq = jest.fn().mockReturnValue({ maybeSingle });
          return { select: jest.fn().mockReturnValue({ eq }) };
        }

        return { select: jest.fn(), insert: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: 'driver-idd' };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user,
      authError: null,
      supabase,
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        ride_id: 'a3c8e5a6-ec45-4e90-9f3b-52f4ef6ccebf',
        passenger_id: 'b6a5b6a7-6f7e-4d3f-9485-9bf6f9c0942f',
        pickup_location: 'San Francisco',
        pickup_time: new Date('2025-12-20T08:30:00Z').toISOString(),
        driver_notes: 'I can take you along',
      }),
    } as unknown as NextRequest;

    await POST(request);

    // Verify seats are decremented when invitation is created
    expect(rideUpdate).toHaveBeenCalledWith({ available_seats: 1 });
    expect(rideUpdateEq).toHaveBeenCalledWith('id', 'a3c8e5a6-ec45-4e90-9f3b-52f4ef6ccebf');
    expect(rideUpdateGt).toHaveBeenCalledWith('available_seats', 0);

    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: 'b6a5b6a7-6f7e-4d3f-9485-9bf6f9c0942f',
      rideId: 'a3c8e5a6-ec45-4e90-9f3b-52f4ef6ccebf',
      content: expect.stringContaining('invited you'),
    });
  });

  it('does not decrement seats when ride has unlimited seats', async () => {
    const ride = {
      poster_id: 'driver-unlimited',
      available_seats: null, // Unlimited seats
      status: 'active',
      title: 'Bus Ride',
      start_location: 'Oakland',
      end_location: 'Tahoe',
      departure_date: '2025-12-21',
      departure_time: '09:00',
    };

    const rideUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const rideUpdate = jest.fn().mockReturnValue({ eq: rideUpdateEq });

    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'rides') {
          const single = jest.fn().mockResolvedValue({ data: ride, error: null });
          const eq = jest.fn().mockReturnValue({ single });
          return { select: jest.fn().mockReturnValue({ eq }), update: rideUpdate };
        }

        if (tableName === 'trip_bookings') {
          const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
          const inChain = jest.fn().mockReturnValue({ maybeSingle });
          const eqSecond = jest.fn().mockReturnValue({ in: inChain });
          const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond });
          const select = jest.fn().mockReturnValue({ eq: eqFirst });
          const insert = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'booking-yy' }, error: null }),
            }),
          });
          return { select, insert };
        }

        if (tableName === 'profiles') {
          const maybeSingle = jest.fn().mockResolvedValue({
            data: { first_name: 'Driver', last_name: 'Unlimited' },
            error: null,
          });
          const eq = jest.fn().mockReturnValue({ maybeSingle });
          return { select: jest.fn().mockReturnValue({ eq }) };
        }

        return { select: jest.fn(), insert: jest.fn(), update: jest.fn() };
      }),
    } as unknown as SupabaseClient<Database>;

    const user = { id: 'driver-unlimited' };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user,
      authError: null,
      supabase,
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        ride_id: 'a1b2c3d4-e5f6-4a5b-9c7d-123456789abc',
        passenger_id: 'b2c3d4e5-f6a7-4b5c-9d8e-234567890def',
        pickup_location: 'Downtown Oakland',
        pickup_time: new Date('2025-12-21T09:00:00Z').toISOString(),
        driver_notes: 'Plenty of space!',
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const responseData = await response.json();

    // Verify the invitation was created successfully
    expect(responseData).toHaveProperty('id', 'booking-yy');

    // Verify seats are NOT decremented for unlimited seats
    expect(rideUpdate).not.toHaveBeenCalled();

    expect(sendConversationMessage).toHaveBeenCalledWith({
      supabase,
      senderId: user.id,
      recipientId: 'b2c3d4e5-f6a7-4b5c-9d8e-234567890def',
      rideId: 'a1b2c3d4-e5f6-4a5b-9c7d-123456789abc',
      content: expect.stringContaining('invited you'),
    });
  });
});
