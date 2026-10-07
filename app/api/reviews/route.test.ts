import type { NextRequest } from 'next/server';
import { POST } from './route';
import { GET as pending } from './pending/route';
import { getAuthenticatedUser, ensureProfileComplete } from '@/lib/supabase/auth';

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  ensureProfileComplete: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
}));

describe('review API contract', () => {
  const ride = {
    departure_date: '2026-07-04',
    departure_time: '23:30:00',
    posting_type: 'driver',
    poster_id: 'driver',
    title: 'Night ride',
    end_location: 'Truckee',
  };
  const booking = {
    id: 'booking',
    driver_id: 'driver',
    passenger_id: 'passenger',
    status: 'confirmed',
    ride,
    driver: { id: 'driver', first_name: 'Driver', last_name: 'Local' },
    passenger: { id: 'passenger', first_name: 'Passenger', last_name: 'Local' },
  };
  const insert = jest.fn();
  const update = jest.fn();

  function authenticate(status = 'confirmed', userId = 'passenger') {
    const row = { ...booking, status };
    const from = jest.fn((table: string) => {
      const result =
        table === 'trip_bookings' ? { data: [row], error: null } : { data: [], error: null };
      const builder = {
        select: jest.fn(),
        eq: jest.fn(),
        or: jest.fn(),
        in: jest.fn(),
        insert,
        update,
        single: jest.fn().mockResolvedValue({
          data: table === 'trip_bookings' ? row : { id: 'review' },
          error: null,
        }),
        // eslint-disable-next-line no-unused-vars
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      for (const method of [builder.select, builder.eq, builder.or, builder.in, insert])
        method.mockReturnValue(builder);
      return builder;
    });
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user: { id: userId },
      authError: null,
      supabase: { from },
    });
    return from;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-05T06:30:01Z'));
    (ensureProfileComplete as jest.Mock).mockResolvedValue(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const request = {
    json: async () => ({
      bookingId: 'booking',
      rating: 5,
      comment: 'Thanks for the excellent ride!',
    }),
  } as NextRequest;

  it.each(['confirmed', 'completed'])(
    'lists and accepts past %s without completing it',
    async (status) => {
      authenticate(status);
      const list = await pending({} as NextRequest);
      expect((await list.json()).pendingReviews).toEqual([
        expect.objectContaining({ booking_id: 'booking' }),
      ]);
      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ reviewer_id: 'passenger', reviewee_id: 'driver' })
      );
      expect(update).not.toHaveBeenCalled();
    }
  );
  it('does not list or accept a ride when UTC is tomorrow but Pacific departure is still ahead', async () => {
    jest.setSystemTime(new Date('2026-07-05T01:00:00Z'));
    authenticate();
    expect((await (await pending({} as NextRequest)).json()).pendingReviews).toEqual([]);
    expect((await POST(request)).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
  it.each(['pending', 'invited', 'cancelled'])('rejects past %s', async (status) => {
    authenticate(status);
    expect((await POST(request)).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
  it('rejects a nonparticipant', async () => {
    authenticate('confirmed', 'outsider');
    expect((await POST(request)).status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });
});
