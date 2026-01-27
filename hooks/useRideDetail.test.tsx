import { renderHook, waitFor } from '@testing-library/react';
import { useRideDetail } from './useRideDetail';
import { createClient } from '@/libs/supabase/client';
import type { RidePostType } from '@/app/community/types';
import type { User } from '@supabase/supabase-js';

jest.mock('@/libs/supabase/client', () => ({
  createClient: jest.fn(),
}));

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

const mockRide: RidePostType = {
  id: 'ride-123',
  poster_id: 'poster-abc',
  posting_type: 'driver',
  start_location: 'Start',
  end_location: 'End',
  start_lat: 1,
  start_lng: 2,
  end_lat: 3,
  end_lng: 4,
  departure_date: '2025-12-01',
  departure_time: '08:00',
  return_date: null,
  return_time: null,
  is_round_trip: false,
  trip_direction: 'departure',
  round_trip_group_id: null,
  is_recurring: false,
  recurring_days: null,
  pricing_type: 'per_seat',
  price_per_seat: 25,
  gas_estimate: 10,
  total_seats: 4,
  available_seats: 3,
  car_type: 'Sedan',
  has_awd: false,
  driving_arrangement: null,
  music_preference: null,
  conversation_preference: null,
  title: 'Ride to Tahoe',
  description: 'Description',
  special_instructions: null,
  status: 'active',
  created_at: '2025-11-25T12:00:00Z',
  owner: null,
  vehicle_id: null,
  vehicle: undefined,
};

const createQueryStub = () => {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  } as const;

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  return query;
};

const makeSupabaseMock = (user: User | null, query: ReturnType<typeof createQueryStub>) => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user } }),
  },
  from: jest.fn(() => query),
});

describe('useRideDetail', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    createClientMock.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns neutral state when rideId is not provided', async () => {
    const { result } = renderHook(() => useRideDetail());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ride).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches ride details when a user is present', async () => {
    const query = createQueryStub();
    query.single.mockResolvedValue({ data: mockRide, error: null });
    const supabaseMock = makeSupabaseMock({ id: 'user-1' } as unknown as User, query);
    createClientMock.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>);

    const { result } = renderHook(() => useRideDetail(mockRide.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ride).toEqual(mockRide);
    expect(result.current.error).toBeNull();
    expect(supabaseMock.from).toHaveBeenCalledWith('rides');
    expect(query.select).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith('id', mockRide.id);
    expect(query.eq).not.toHaveBeenCalledWith('status', 'active');
    expect(query.single).toHaveBeenCalled();
  });

  it('applies the active status filter when no user is logged in', async () => {
    const query = createQueryStub();
    query.single.mockResolvedValue({ data: mockRide, error: null });
    const supabaseMock = makeSupabaseMock(null, query);
    createClientMock.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>);

    const { result } = renderHook(() => useRideDetail(mockRide.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(query.eq).toHaveBeenCalledWith('status', 'active');
    expect(result.current.ride).toEqual(mockRide);
  });

  it('sets an informational error when the ride is missing', async () => {
    const query = createQueryStub();
    query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    const supabaseMock = makeSupabaseMock(null, query);
    createClientMock.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>);

    const { result } = renderHook(() => useRideDetail(mockRide.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('This ride is no longer active or has been removed.');
    expect(result.current.ride).toBeNull();
  });

  it('handles unexpected failures gracefully', async () => {
    const query = createQueryStub();
    const networkError = new Error('network failure');
    query.single.mockRejectedValue(networkError);
    const supabaseMock = makeSupabaseMock(null, query);
    createClientMock.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>);

    const { result } = renderHook(() => useRideDetail(mockRide.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load ride details');
    expect(result.current.ride).toBeNull();
  });
});
