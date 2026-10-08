/** @jest-environment node */
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { GET } from './route';

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
}));

it('retains live past review prompts but never regenerates a deleted-counterpart prompt', async () => {
  const passenger = { id: 'me', first_name: 'Survivor', last_name: null, deleted_at: null };
  const booking = {
    passenger_id: 'me',
    status: 'confirmed',
    passenger,
    ride: {
      title: null,
      start_location: 'Truckee',
      end_location: 'Reno',
      departure_date: '2020-01-01',
      departure_time: '06:00',
    },
  };
  const bookings = [
    {
      ...booking,
      id: 'live-booking',
      driver_id: 'live',
      driver: { id: 'live', first_name: 'Live', last_name: null, deleted_at: null },
    },
    {
      ...booking,
      id: 'deleted-booking',
      driver_id: 'deleted',
      driver: {
        id: 'deleted',
        first_name: 'Deleted member',
        last_name: null,
        deleted_at: '2026-10-08T00:00:00Z',
      },
    },
  ];
  const bookingQuery = {
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data: bookings, error: null }),
  };
  const reviewQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
  jest.mocked(getAuthenticatedUser).mockResolvedValue({
    user: { id: 'me' },
    authError: null,
    supabase: { from: (table: string) => (table === 'trip_bookings' ? bookingQuery : reviewQuery) },
  } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);
  const response = await GET(new NextRequest('http://localhost/api/reviews/pending'));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.pendingReviews).toHaveLength(1);
  expect(body.pendingReviews[0]).toMatchObject({
    booking_id: 'live-booking',
    other_participant_name: 'Live',
  });
  expect(reviewQuery.in).toHaveBeenCalledWith('booking_id', ['live-booking']);
});
