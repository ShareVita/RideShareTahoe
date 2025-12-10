import { renderHook, act } from '@testing-library/react';
import { useRideActions } from './useRideActions';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';
import type { RidePostType, CommunityUser } from '../types';

describe('useRideActions', () => {
  const mockSetMyRides = jest.fn();
  const mockUser = { id: 'user-1' } as unknown as CommunityUser;
  const mockFrom = jest.fn();
  const mockUpdate = jest.fn();
  const mockEq = jest.fn();

  const mockSupabase = {
    from: mockFrom,
  } as unknown as CommunitySupabaseClient;

  // Setup promise mocking helper
  const mockEqPromise = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful response
    mockEqPromise.mockResolvedValue({ error: null });

    // Setup the mocked return values
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });

    // Simplify the chain mock to avoid "nest functions > 4 levels"
    mockEq.mockImplementation(() => ({
      eq: () => mockEqPromise(),
    }));

    globalThis.confirm = jest.fn(() => true); // Default to yes
    globalThis.alert = jest.fn();

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should require confirmation before deleting', async () => {
    (globalThis.confirm as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useRideActions(mockSupabase, mockUser, mockSetMyRides));

    await act(async () => {
      await result.current.deletePost('post-1');
    });

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should not proceed if user is missing', async () => {
    const { result } = renderHook(() =>
      useRideActions(mockSupabase, null as unknown as CommunityUser, mockSetMyRides)
    );

    await act(async () => {
      await result.current.deletePost('post-1');
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should delete post successfully', async () => {
    const { result } = renderHook(() => useRideActions(mockSupabase, mockUser, mockSetMyRides));

    await act(async () => {
      await result.current.deletePost('post-1');
    });

    expect(mockFrom).toHaveBeenCalledWith('rides');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'inactive' });
    expect(mockSetMyRides).toHaveBeenCalled();

    // Test the filter function passed to setMyRides
    const filterFn = mockSetMyRides.mock.calls[0][0];
    const initialPosts = [{ id: 'post-1' }, { id: 'post-2' }] as unknown as RidePostType[];
    const filteredPosts = filterFn(initialPosts);
    expect(filteredPosts).toEqual([{ id: 'post-2' }]);

    expect(globalThis.alert).toHaveBeenCalledWith('Post deleted successfully');
  });

  it('should handle Supabase errors', async () => {
    // Override the promise to fail
    mockEqPromise.mockResolvedValue({ error: { message: 'Database error' } });

    const { result } = renderHook(() => useRideActions(mockSupabase, mockUser, mockSetMyRides));

    await act(async () => {
      await result.current.deletePost('post-1');
    });

    expect(mockSetMyRides).not.toHaveBeenCalled();
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to delete post'));
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle unexpected errors', async () => {
    // Override to throw
    mockEqPromise.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useRideActions(mockSupabase, mockUser, mockSetMyRides));

    await act(async () => {
      await result.current.deletePost('post-1');
    });

    expect(mockSetMyRides).not.toHaveBeenCalled();
    expect(globalThis.alert).toHaveBeenCalledWith('Failed to delete post: Unknown error');
  });
});
