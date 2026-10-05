import { toPosterLabel, toPublicPlace, toPublicRide } from './publicRides';

describe('public ride directory mapping', () => {
  it('hides street addresses and keeps the town', () => {
    expect(toPublicPlace('123 Main St, Oakland, CA 94610')).toBe('Oakland, CA 94610');
    expect(toPublicPlace('Rockridge BART, Oakland')).toBe('Rockridge BART, Oakland');
    expect(toPublicPlace('Palisades Tahoe')).toBe('Palisades Tahoe');
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
      from: 'San Francisco, CA',
      to: 'Northstar California, Truckee',
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
});
