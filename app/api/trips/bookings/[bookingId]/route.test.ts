import type { NextRequest } from 'next/server';
import { PATCH } from './route';
import { getAuthenticatedUser, ensureProfileComplete } from '@/lib/supabase/auth';
import { sendConversationMessage } from '@/lib/supabase/conversations';

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
  ensureProfileComplete: jest.fn(),
}));
jest.mock('@/lib/supabase/conversations', () => ({ sendConversationMessage: jest.fn() }));

describe('PATCH /api/trips/bookings/[bookingId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureProfileComplete as jest.Mock).mockResolvedValue(null);
  });

  function setup(
    status = 'pending',
    role = 'driver',
    result = {
      data: { id: 'booking-1' } as { id: string } | null,
      error: null as { code: string; message: string } | null,
    }
  ) {
    const booking = {
      id: 'booking-1',
      driver_id: 'driver',
      passenger_id: 'passenger',
      status,
      ride_id: 'ride-1',
      pickup_location: 'Downtown',
      pickup_time: '2025-12-25T17:15:00Z',
      ride: { title: 'Mountain Run', available_seats: 0 },
      passenger: { first_name: 'Rider', last_name: 'Guest' },
      driver: { first_name: 'Driver', last_name: 'Test' },
    };
    const mutation = {
      eq: jest.fn(),
      select: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue(result),
    };
    mutation.eq.mockReturnValue(mutation);
    mutation.select.mockReturnValue(mutation);
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: booking, error: null }),
          })),
        })),
        update: jest.fn(() => mutation),
      })),
    };
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user: { id: role }, supabase });
    return { mutation };
  }

  async function act(action: string, bookingId = 'booking-1') {
    return PATCH(
      {
        url: 'https://example.com/api/trips/bookings/booking-1',
        json: async () => ({ action }),
      } as NextRequest,
      { params: Promise.resolve({ bookingId }) }
    );
  }

  it.each([
    ['pending', 'driver', 'approve', 'confirmed', 'confirmed'],
    ['pending', 'passenger', 'cancel', 'cancelled', 'cancelled my request'],
    ['invited', 'passenger', 'approve', 'confirmed', 'accepted the invite'],
    ['invited', 'passenger', 'deny', 'cancelled', 'declined the invitation'],
    ['invited', 'driver', 'deny', 'cancelled', 'cancelled the invitation'],
  ])(
    'handles %s %s %s and notifies only after success',
    async (status, role, action, next, message) => {
      const { mutation } = setup(status, role);
      const response = await act(action);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, status: next });
      expect(mutation.eq).toHaveBeenCalledWith('status', status);
      expect(sendConversationMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: role === 'driver' ? 'passenger' : 'driver',
          content: expect.stringContaining(message),
        })
      );
      if (action === 'approve') {
        expect((sendConversationMessage as jest.Mock).mock.calls[0][0].content).toContain(
          'Dec 25, 2025, 9:15 AM'
        );
      }
    }
  );

  it('uses the URL fallback when params are empty', async () => {
    const { mutation } = setup();
    expect((await act('approve', '')).status).toBe(200);
    expect(mutation.eq).toHaveBeenCalledWith('id', 'booking-1');
  });

  it('returns capacity conflict without success notification', async () => {
    setup('pending', 'driver', {
      data: null,
      error: { code: 'P0001', message: 'No seats available' },
    });
    const response = await act('approve');
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'No seats available' });
    expect(sendConversationMessage).not.toHaveBeenCalled();
  });

  it.each(['approve', 'deny', 'cancel'])(
    'rejects stale %s without success notification',
    async (action) => {
      setup('pending', action === 'cancel' ? 'passenger' : 'driver', { data: null, error: null });
      const response = await act(action);
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: expect.stringContaining('Booking status changed'),
      });
      expect(sendConversationMessage).not.toHaveBeenCalled();
    }
  );
});
