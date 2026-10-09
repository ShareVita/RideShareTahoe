import type { NextRequest } from 'next/server';
import { POST } from './route';
import { getAuthenticatedUser, ensureProfileComplete } from '@/lib/supabase/auth';
import { sendConversationMessage } from '@/lib/supabase/conversations';

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
  ensureProfileComplete: jest.fn(),
}));
jest.mock('@/lib/supabase/conversations', () => ({ sendConversationMessage: jest.fn() }));

describe('POST /api/trips/invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureProfileComplete as jest.Mock).mockResolvedValue(null);
  });

  function setup(
    availableSeats: number | null,
    error: { code: string; message: string } | null = null
  ) {
    const supabase = {
      from: jest.fn((table: string) => {
        const chain = { eq: jest.fn(), in: jest.fn(), single: jest.fn(), maybeSingle: jest.fn() };
        chain.eq.mockReturnValue(chain);
        chain.in.mockReturnValue(chain);
        const data =
          table === 'rides'
            ? {
                poster_id: 'driver',
                available_seats: availableSeats,
                status: 'active',
                title: 'Mountain Ride',
                departure_date: '2025-12-20',
                departure_time: '08:30',
              }
            : table === 'profiles'
              ? { first_name: 'Driver', last_name: 'Test', deleted_at: null }
              : null;
        chain.single.mockResolvedValue({ data, error: null });
        chain.maybeSingle.mockResolvedValue({ data, error: null });
        return {
          select: jest.fn(() => chain),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest
                .fn()
                .mockResolvedValue({ data: error ? null : { id: 'booking-1' }, error }),
            })),
          })),
        };
      }),
    };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user: { id: 'driver' }, supabase });
  }

  async function invite() {
    return POST({
      json: async () => ({
        ride_id: 'a3c8e5a6-ec45-4e90-9f3b-52f4ef6ccebf',
        passenger_id: 'b6a5b6a7-6f7e-4d3f-9485-9bf6f9c0942f',
        pickup_location: 'San Francisco',
        pickup_time: '2025-12-20T08:30:00Z',
      }),
    } as NextRequest);
  }

  it.each([2, null, 0])(
    'returns the database-created invitation with seats %s and notifies the passenger',
    async (seats) => {
      setup(seats);
      const response = await invite();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ id: 'booking-1' });
      expect(sendConversationMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'b6a5b6a7-6f7e-4d3f-9485-9bf6f9c0942f',
          content: expect.stringContaining('invited you'),
        })
      );
    }
  );

  it('returns database capacity conflict without notifying the passenger', async () => {
    setup(1, { code: 'P0001', message: 'No seats available' });
    const response = await invite();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'No seats available' });
    expect(sendConversationMessage).not.toHaveBeenCalled();
  });
});
