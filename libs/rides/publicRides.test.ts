import {
  fetchPublicUpcomingRides,
  fetchPublicRecentRides,
  recentTripWindow,
  toPosterLabel,
  toPublicPlace,
  toPublicRide,
} from './publicRides';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

describe('public ride directory mapping', () => {
  it('hides street addresses and keeps the town', () => {
    expect(toPublicPlace('123 Main St, Oakland, CA 94610')).toBe('Oakland');
    expect(toPublicPlace('Rockridge BART, Oakland')).toBe('Oakland');
    expect(toPublicPlace('500 Main St, Apt 2, Truckee, CA')).toBe('Truckee');
    expect(toPublicPlace('Unit 5, 1200 Main Street, Incline Village, NV')).toBe('Incline Village');
    expect(toPublicPlace('  san francisco , CA')).toBe('San Francisco');
  });

  it.each([
    ['Palisades Tahoe', 'Palisades Tahoe'],
    ['Squaw Valley', 'Palisades Tahoe'],
    ['Northstar California, Truckee, CA', 'Northstar'],
    ['Heavenly', 'Heavenly'],
    ['Kirkwood Mountain Resort', 'Kirkwood'],
    ['Mt. Rose', 'Mt. Rose'],
    ['Sierra at Tahoe', 'Sierra-at-Tahoe'],
  ])('names the ski resort: %s', (input, expected) => {
    expect(toPublicPlace(input)).toBe(expected);
  });

  it.each([
    ['Mountain View, CA', 'Mountain View'],
    ['Walnut Creek', 'Walnut Creek'],
    ['Truckee CA', 'Truckee'],
    ['South Lake', 'South Lake Tahoe'],
    ['South San Francisco', 'South San Francisco'],
    ['East Palo Alto, CA', 'East Palo Alto'],
    ['Reno-Tahoe International Airport RNO', 'Reno-Tahoe Airport'],
    ['Lake Tahoe', 'Lake Tahoe'],
  ])('names the town or region without a street: %s', (input, expected) => {
    expect(toPublicPlace(input)).toBe(expected);
  });

  it.each([
    '123 Main St',
    'Meet at my apartment',
    '123 Main St, Apt 2',
    'Unit 7, Oakland Avenue',
    'San Francisco Blvd',
    '42 Truckee Way',
    'Unknown Town, CA',
    'Secret cove or sand beach',
    '',
  ])('never exposes unverified freeform pickup text: %s', (input) => {
    expect(toPublicPlace(input)).toBe('Location shared after sign-in');
  });

  it('reduces the poster to first name and last initial', () => {
    expect(toPosterLabel({ id: 'a', first_name: 'Kaia', last_name: 'Colban' })).toBe('Kaia C.');
    expect(toPosterLabel({ id: 'a', first_name: 'Maya', last_name: null })).toBe('Maya');
    expect(toPosterLabel(undefined)).toBe('Community member');
  });

  it('exposes trip facts only', () => {
    const ride = toPublicRide(
      {
        id: 'ride-1',
        poster_id: 'user-1',
        posting_type: 'driver',
        start_location: '500 Market St, San Francisco, CA',
        end_location: 'Northstar California, Truckee, CA',
        departure_date: '2026-12-13',
        departure_time: '06:00:00',
        is_round_trip: true,
        return_date: '2026-12-14',
        available_seats: 2,
        total_seats: 3,
        price_per_seat: 25,
        car_type: 'SUV',
        has_awd: true,
      },
      { id: 'user-1', first_name: 'Chris', last_name: 'Nguyen' }
    );

    expect(ride).toEqual({
      id: 'ride-1',
      postingType: 'driver',
      from: 'San Francisco',
      to: 'Northstar',
      departureDate: '2026-12-13',
      departureTime: '06:00:00',
      isRoundTrip: true,
      returnDate: '2026-12-14',
      seatsAvailable: 2,
      pricePerSeat: 25,
      carType: 'SUV',
      hasAwd: true,
      posterLabel: 'Chris N.',
    });
    expect(ride).not.toHaveProperty('poster_id');
  });

  it('builds a past-trip window that ends yesterday', () => {
    expect(recentTripWindow(new Date('2026-10-05T12:00:00Z'), 365)).toEqual({
      from: '2025-10-05',
      to: '2026-10-04',
    });
  });

  it('does not put today into the recent window when UTC is already tomorrow', () => {
    expect(recentTripWindow(new Date('2026-10-05T01:00:00Z'), 7)).toEqual({
      from: '2026-09-27',
      to: '2026-10-03',
    });
  });

  it.each([fetchPublicUpcomingRides, fetchPublicRecentRides])(
    'does not advertise deleted posters, including completed history',
    async (fetchRides) => {
      const ride = { posting_type: 'driver', start_location: 'Truckee', end_location: 'Reno' };
      const ridesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            { ...ride, id: 'live-ride', poster_id: 'live' },
            { ...ride, id: 'deleted-ride', poster_id: 'deleted' },
          ],
          error: null,
        }),
      };
      const profilesQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'live', first_name: 'Live', last_name: null, deleted_at: null },
            {
              id: 'deleted',
              first_name: 'Deleted member',
              last_name: null,
              deleted_at: '2026-10-08T00:00:00Z',
            },
          ],
          error: null,
        }),
      };
      const client = {
        from: (table: string) => (table === 'rides' ? ridesQuery : profilesQuery),
      } as unknown as SupabaseClient<Database>;
      expect((await fetchRides(client)).map((r) => r.id)).toEqual(['live-ride']);
    }
  );
});
