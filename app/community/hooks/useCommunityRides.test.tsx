import { renderHook, waitFor, act } from '@testing-library/react';
import { useCommunityRides } from './useCommunityRides';
import { fetchMyRides } from '@/libs/community/ridesData';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommunityUser, RidePostType } from '../types';

// Mock dependencies
jest.mock('@/libs/community/ridesData', () => ({
  fetchMyRides: jest.fn(),
}));

describe('useCommunityRides', () => {
  const mockSupabase = {} as SupabaseClient;
  const mockUser = { id: 'user-1' } as unknown as CommunityUser;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading true and empty rides', () => {
    const { result } = renderHook(() => useCommunityRides(mockSupabase, mockUser));

    expect(result.current.dataLoading).toBe(true);
    expect(result.current.myRides).toEqual([]);
  });

  it('should fetch rides when user is present', async () => {
    const mockRides = [{ id: 'ride-1' }] as unknown as RidePostType[];
    (fetchMyRides as jest.Mock).mockResolvedValue(mockRides);

    const { result } = renderHook(() => useCommunityRides(mockSupabase, mockUser));

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false);
    });

    expect(fetchMyRides).toHaveBeenCalledWith(mockSupabase, mockUser);
    expect(result.current.myRides).toEqual(mockRides);
  });

  it('should set rides to empty if no user', async () => {
    const { result } = renderHook(() => useCommunityRides(mockSupabase, null));

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false);
    });

    expect(fetchMyRides).not.toHaveBeenCalled();
    expect(result.current.myRides).toEqual([]);
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fetchMyRides as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useCommunityRides(mockSupabase, mockUser));

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error in fetchRidesData wrapper:', expect.any(Error));
    expect(result.current.myRides).toEqual([]);

    consoleSpy.mockRestore();
  });

  it('should allow manual refetching', async () => {
    const mockRides = [{ id: 'ride-1' }] as unknown as RidePostType[];
    (fetchMyRides as jest.Mock).mockResolvedValue(mockRides);

    const { result } = renderHook(() => useCommunityRides(mockSupabase, mockUser));

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false);
    });

    // Reset mocks for the second call
    (fetchMyRides as jest.Mock).mockClear();
    (fetchMyRides as jest.Mock).mockResolvedValue([{ id: 'ride-2' }]);

    await act(async () => {
      await result.current.fetchRidesData();
    });

    expect(fetchMyRides).toHaveBeenCalledTimes(1);
    expect(result.current.myRides).toEqual([{ id: 'ride-2' }]);
  });
});
