import { renderHook, act } from '@testing-library/react';
import { useRideActions } from './useRideActions';
import type { RidePostType, CommunityUser } from '../types';
import { toast } from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useRideActions', () => {
  const mockSetMyRides = jest.fn();
  const mockUser = { id: 'user-1' } as unknown as CommunityUser;

  const mockSingleRide: RidePostType = {
    id: 'post-1',
    title: 'Test Ride',
    poster_id: 'user-1',
    departure_date: '2025-01-15',
    posting_type: 'driver',
    status: 'active',
  } as RidePostType;

  const mockRoundTripDeparture: RidePostType = {
    id: 'post-2',
    title: 'Round Trip',
    poster_id: 'user-1',
    departure_date: '2025-01-15',
    posting_type: 'driver',
    status: 'active',
    round_trip_group_id: 'rt-group-1',
    trip_direction: 'departure',
    is_recurring: false,
  } as RidePostType;

  const mockSeriesRide: RidePostType = {
    id: 'post-3',
    title: 'Multi-date Series',
    poster_id: 'user-1',
    departure_date: '2025-01-15',
    posting_type: 'driver',
    status: 'active',
    round_trip_group_id: 'series-1',
    is_recurring: true,
  } as RidePostType;

  const mockSeriesRide2: RidePostType = {
    id: 'post-4',
    title: 'Multi-date Series',
    poster_id: 'user-1',
    departure_date: '2025-01-22',
    posting_type: 'driver',
    status: 'active',
    round_trip_group_id: 'series-1',
    is_recurring: true,
  } as RidePostType;

  let mockMyRides: RidePostType[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMyRides = [mockSingleRide];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, deletedIds: ['post-1'] }),
    });

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('deletePost', () => {
    it('deletes single ride successfully without confirmation', async () => {
      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-1');
      });

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rides/post-1?apply_to=single', {
        method: 'DELETE',
      });

      expect(mockSetMyRides).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Ride deleted successfully');
    });

    it('sets pending deletion for multi-date series requiring confirmation', async () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-3');
      });

      // Should set pendingDeletion state for series rides
      expect(result.current.pendingDeletion).not.toBeNull();
      expect(result.current.pendingDeletion?.isMultiDateSeries).toBe(true);
      expect(result.current.pendingDeletion?.seriesRides).toHaveLength(2);
      // Should NOT call fetch yet - waiting for scope selection
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('deletes round trips directly without confirmation', async () => {
      mockMyRides = [mockRoundTripDeparture];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-2');
      });

      // Round trips are deleted directly without confirmation modal
      expect(result.current.pendingDeletion).toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rides/post-2?apply_to=series', {
        method: 'DELETE',
      });
    });

    it('does not proceed without user', async () => {
      const { result } = renderHook(() => useRideActions(null, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-1');
      });

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('does not delete if ride not found', async () => {
      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('nonexistent-id');
      });

      expect(result.current.pendingDeletion).toBeNull();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('confirmDelete', () => {
    it('handles series deletion with scope selection', async () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, deletedIds: ['post-3', 'post-4'] }),
      });

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      // First, initiate deletion which sets pendingDeletion
      await act(async () => {
        await result.current.deletePost('post-3');
      });

      expect(result.current.pendingDeletion).not.toBeNull();

      // Then confirm deletion with 'all' scope
      await act(async () => {
        await result.current.confirmDelete('all');
      });

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rides/post-3?apply_to=series', {
        method: 'DELETE',
      });
    });

    it('handles single scope deletion', async () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-3');
      });

      await act(async () => {
        await result.current.confirmDelete('single');
      });

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rides/post-3?apply_to=single', {
        method: 'DELETE',
      });
    });

    it('handles future scope deletion', async () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-3');
      });

      await act(async () => {
        await result.current.confirmDelete('future');
      });

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rides/post-3?apply_to=future', {
        method: 'DELETE',
      });
    });
  });

  describe('cancelDelete', () => {
    it('can cancel pending deletion', async () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-3');
      });

      expect(result.current.pendingDeletion).not.toBeNull();

      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.pendingDeletion).toBeNull();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles API errors', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Database error' }),
      });

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-1');
      });

      expect(mockSetMyRides).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Database error');
    });

    it('handles network errors', async () => {
      (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      await act(async () => {
        await result.current.deletePost('post-1');
      });

      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
  });

  describe('deletingPost state', () => {
    it('manages deletingPost state during deletion', async () => {
      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      expect(result.current.deletingPost).toBeNull();

      await act(async () => {
        await result.current.deletePost('post-1');
      });

      expect(result.current.deletingPost).toBeNull();
    });
  });

  describe('editPost', () => {
    it('returns edit URL for single rides', () => {
      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      const editUrl = result.current.editPost('post-1');

      expect(editUrl).toBe('/rides/edit/post-1');
      expect(result.current.pendingEdit).toBeNull();
    });

    it('sets pending edit for series rides', () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      let editUrl: string | null = null;
      act(() => {
        editUrl = result.current.editPost('post-3');
      });

      // Returns null to indicate modal should be shown
      expect(editUrl).toBeNull();
      expect(result.current.pendingEdit).not.toBeNull();
      expect(result.current.pendingEdit?.isMultiDateSeries).toBe(true);
      expect(result.current.pendingEdit?.seriesRides).toHaveLength(2);
    });

    it('returns edit URL for round trips (not series)', () => {
      mockMyRides = [mockRoundTripDeparture];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      const editUrl = result.current.editPost('post-2');

      // Round trips go directly to edit page
      expect(editUrl).toBe('/rides/edit/post-2');
      expect(result.current.pendingEdit).toBeNull();
    });

    it('returns null if user not authenticated', () => {
      const { result } = renderHook(() => useRideActions(null, mockSetMyRides, mockMyRides));

      const editUrl = result.current.editPost('post-1');

      expect(editUrl).toBeNull();
    });

    it('returns null if ride not found', () => {
      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      const editUrl = result.current.editPost('nonexistent');

      expect(editUrl).toBeNull();
    });
  });

  describe('confirmEdit', () => {
    it('returns correct URL for single scope', () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      act(() => {
        result.current.editPost('post-3');
      });

      let url: string | null = null;
      act(() => {
        url = result.current.confirmEdit('single');
      });

      expect(url).toBe('/rides/edit/post-3?mode=single');
      expect(result.current.pendingEdit).toBeNull();
    });

    it('returns correct URL for future scope', () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      act(() => {
        result.current.editPost('post-3');
      });

      let url: string | null = null;
      act(() => {
        url = result.current.confirmEdit('future');
      });

      expect(url).toBe('/rides/edit/post-3?mode=future');
    });

    it('returns correct URL for all scope', () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      act(() => {
        result.current.editPost('post-3');
      });

      let url: string | null = null;
      act(() => {
        url = result.current.confirmEdit('all');
      });

      expect(url).toBe('/rides/edit/post-3?mode=series');
    });
  });

  describe('cancelEdit', () => {
    it('clears pending edit state', () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      act(() => {
        result.current.editPost('post-3');
      });

      expect(result.current.pendingEdit).not.toBeNull();

      act(() => {
        result.current.cancelEdit();
      });

      expect(result.current.pendingEdit).toBeNull();
    });
  });

  describe('getEditUrl', () => {
    it('returns null when no pending edit', () => {
      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      const url = result.current.getEditUrl('single');

      expect(url).toBeNull();
    });

    it('returns correct URL when pending edit exists', () => {
      mockMyRides = [mockSeriesRide, mockSeriesRide2];

      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      act(() => {
        result.current.editPost('post-3');
      });

      expect(result.current.getEditUrl('single')).toBe('/rides/edit/post-3?mode=single');
      expect(result.current.getEditUrl('future')).toBe('/rides/edit/post-3?mode=future');
      expect(result.current.getEditUrl('all')).toBe('/rides/edit/post-3?mode=series');
    });
  });

  describe('hook return value', () => {
    it('does not export legacy confirmDeleteGroup and confirmDeleteSingle methods', () => {
      const { result } = renderHook(() => useRideActions(mockUser, mockSetMyRides, mockMyRides));

      // Verify the hook returns the expected methods
      expect(result.current).toHaveProperty('deletePost');
      expect(result.current).toHaveProperty('deletingPost');
      expect(result.current).toHaveProperty('pendingDeletion');
      expect(result.current).toHaveProperty('cancelDelete');
      expect(result.current).toHaveProperty('confirmDelete');
      expect(result.current).toHaveProperty('editPost');
      expect(result.current).toHaveProperty('pendingEdit');
      expect(result.current).toHaveProperty('cancelEdit');
      expect(result.current).toHaveProperty('confirmEdit');
      expect(result.current).toHaveProperty('getEditUrl');

      // Verify legacy methods are no longer exported
      expect(result.current).not.toHaveProperty('confirmDeleteGroup');
      expect(result.current).not.toHaveProperty('confirmDeleteSingle');
    });
  });
});
