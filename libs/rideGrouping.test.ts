import {
  filterDepartureLegs,
  filterDepartureLegsPartial,
  extractSeriesGroups,
} from './rideGrouping';
import type { RidePostType } from '@/app/community/types';

// Helper to create mock rides with all required properties
const createMockRide = (overrides: Partial<RidePostType> = {}): RidePostType => {
  const base: RidePostType = {
    id: 'ride-1',
    poster_id: 'user-1',
    title: 'Test Ride',
    start_location: 'San Francisco',
    end_location: 'Lake Tahoe',
    start_lat: null,
    start_lng: null,
    end_lat: null,
    end_lng: null,
    departure_date: '2025-06-15',
    departure_time: '08:00:00',
    posting_type: 'driver',
    is_round_trip: false,
    trip_direction: null,
    round_trip_group_id: null,
    is_recurring: false,
    recurring_days: null,
    pricing_type: null,
    price_per_seat: 25,
    gas_estimate: null,
    total_seats: 4,
    available_seats: 3,
    car_type: null,
    has_awd: false,
    driving_arrangement: null,
    music_preference: null,
    conversation_preference: null,
    description: null,
    special_instructions: null,
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    owner: null,
    return_date: null,
    return_time: null,
  };
  return { ...base, ...overrides };
};

describe('filterDepartureLegs', () => {
  it('returns rides with no trip_direction (standalone rides)', () => {
    const rides = [
      createMockRide({ id: '1', trip_direction: undefined }),
      createMockRide({ id: '2', trip_direction: null }),
    ];

    const result = filterDepartureLegs(rides);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['1', '2']);
  });

  it('returns rides with trip_direction = "departure"', () => {
    const rides = [
      createMockRide({ id: '1', trip_direction: 'departure' }),
      createMockRide({ id: '2', trip_direction: 'departure' }),
    ];

    const result = filterDepartureLegs(rides);

    expect(result).toHaveLength(2);
  });

  it('filters out rides with trip_direction = "return"', () => {
    const rides = [
      createMockRide({ id: '1', trip_direction: 'departure' }),
      createMockRide({ id: '2', trip_direction: 'return' }),
      createMockRide({ id: '3', trip_direction: 'return' }),
    ];

    const result = filterDepartureLegs(rides);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('handles mixed ride types correctly', () => {
    const rides = [
      createMockRide({ id: '1', trip_direction: undefined }),
      createMockRide({ id: '2', trip_direction: 'departure' }),
      createMockRide({ id: '3', trip_direction: 'return' }),
      createMockRide({ id: '4', trip_direction: null }),
    ];

    const result = filterDepartureLegs(rides);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['1', '2', '4']);
  });

  it('returns empty array when all rides are return legs', () => {
    const rides = [
      createMockRide({ id: '1', trip_direction: 'return' }),
      createMockRide({ id: '2', trip_direction: 'return' }),
    ];

    const result = filterDepartureLegs(rides);

    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const result = filterDepartureLegs([]);

    expect(result).toHaveLength(0);
  });
});

describe('filterDepartureLegsPartial', () => {
  it('works with Partial<RidePostType> arrays', () => {
    const partialRides: Partial<RidePostType>[] = [
      { id: '1', trip_direction: 'departure' },
      { id: '2', trip_direction: 'return' },
      { id: '3' }, // No trip_direction
    ];

    const result = filterDepartureLegsPartial(partialRides);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('handles minimal partial rides', () => {
    const partialRides: Partial<RidePostType>[] = [
      { trip_direction: 'departure' },
      { trip_direction: 'return' },
      {},
    ];

    const result = filterDepartureLegsPartial(partialRides);

    expect(result).toHaveLength(2);
  });
});

describe('extractSeriesGroups', () => {
  it('groups recurring rides by round_trip_group_id', () => {
    const rides = [
      createMockRide({
        id: '1',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        departure_date: '2025-06-15',
      }),
      createMockRide({
        id: '2',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        departure_date: '2025-06-16',
      }),
      createMockRide({
        id: '3',
        round_trip_group_id: 'group-b',
        is_recurring: true,
        departure_date: '2025-06-20',
      }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result).toHaveLength(2);
    expect(result[0].groupId).toBe('group-a');
    expect(result[0].rides).toHaveLength(2);
    expect(result[1].groupId).toBe('group-b');
    expect(result[1].rides).toHaveLength(1);
  });

  it('excludes rides without round_trip_group_id', () => {
    const rides = [
      createMockRide({
        id: '1',
        round_trip_group_id: 'group-a',
        is_recurring: true,
      }),
      createMockRide({
        id: '2',
        round_trip_group_id: undefined,
        is_recurring: true,
      }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result).toHaveLength(1);
    expect(result[0].rides).toHaveLength(1);
  });

  it('excludes rides with is_recurring = false', () => {
    const rides = [
      createMockRide({
        id: '1',
        round_trip_group_id: 'group-a',
        is_recurring: true,
      }),
      createMockRide({
        id: '2',
        round_trip_group_id: 'group-a',
        is_recurring: false,
      }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result).toHaveLength(1);
    expect(result[0].rides).toHaveLength(1);
  });

  it('sorts rides within each group by departure_date', () => {
    const rides = [
      createMockRide({
        id: '3',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        departure_date: '2025-06-20',
      }),
      createMockRide({
        id: '1',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        departure_date: '2025-06-10',
      }),
      createMockRide({
        id: '2',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        departure_date: '2025-06-15',
      }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result[0].rides.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('sorts groups by first ride departure_date', () => {
    const rides = [
      createMockRide({
        id: '1',
        round_trip_group_id: 'group-b',
        is_recurring: true,
        departure_date: '2025-07-01',
      }),
      createMockRide({
        id: '2',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        departure_date: '2025-06-01',
      }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result[0].groupId).toBe('group-a');
    expect(result[1].groupId).toBe('group-b');
  });

  it('extracts title from first ride in series', () => {
    const rides = [
      createMockRide({
        id: '1',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        title: 'Weekly Tahoe Trip',
        departure_date: '2025-06-10',
      }),
      createMockRide({
        id: '2',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        title: 'Weekly Tahoe Trip',
        departure_date: '2025-06-17',
      }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result[0].title).toBe('Weekly Tahoe Trip');
  });

  it('uses "Untitled Series" when title is missing', () => {
    const rides = [
      createMockRide({
        id: '1',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        title: undefined,
      }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result[0].title).toBe('Untitled Series');
  });

  it('extracts start_location and end_location from first ride', () => {
    const rides = [
      createMockRide({
        id: '1',
        round_trip_group_id: 'group-a',
        is_recurring: true,
        start_location: 'Oakland',
        end_location: 'Squaw Valley',
      }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result[0].start_location).toBe('Oakland');
    expect(result[0].end_location).toBe('Squaw Valley');
  });

  it('returns empty array for empty input', () => {
    const result = extractSeriesGroups([]);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when no rides are recurring', () => {
    const rides = [
      createMockRide({ id: '1', is_recurring: false }),
      createMockRide({ id: '2', is_recurring: false }),
    ];

    const result = extractSeriesGroups(rides);

    expect(result).toHaveLength(0);
  });
});
