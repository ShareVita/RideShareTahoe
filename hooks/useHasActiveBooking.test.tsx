import { renderHook, waitFor } from '@testing-library/react';
import { useHasActiveBooking } from './useHasActiveBooking';

// Mock supabase
jest.mock('@/libs/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => ({
          or: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn(),
            })),
          })),
        })),
      })),
    })),
  },
}));

import { supabase } from '@/libs/supabase';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useHasActiveBooking', () => {
  const validUserId1 = '12345678-1234-1234-1234-123456789abc';
  const validUserId2 = '87654321-4321-4321-4321-cba987654321';

  let mockMaybeSingle: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle = jest.fn();

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      }),
    });
  });

  it('returns false when currentUserId is undefined', async () => {
    const { result } = renderHook(() => useHasActiveBooking(undefined, validUserId2));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(false);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns false when otherUserId is undefined', async () => {
    const { result } = renderHook(() => useHasActiveBooking(validUserId1, undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(false);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns false when both userIds are the same', async () => {
    const { result } = renderHook(() => useHasActiveBooking(validUserId1, validUserId1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(false);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns false when currentUserId is invalid UUID', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useHasActiveBooking('invalid-uuid', validUserId2));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid UUID format:', expect.any(Object));

    consoleErrorSpy.mockRestore();
  });

  it('returns false when otherUserId is invalid UUID', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useHasActiveBooking(validUserId1, 'invalid-uuid'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid UUID format:', expect.any(Object));

    consoleErrorSpy.mockRestore();
  });

  it('returns true when an active booking exists', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'booking-1' },
      error: null,
    });

    const { result } = renderHook(() => useHasActiveBooking(validUserId1, validUserId2));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('trip_bookings');
  });

  it('returns false when no booking exists', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useHasActiveBooking(validUserId1, validUserId2));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(false);
  });

  it('handles database error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Database error' },
    });

    const { result } = renderHook(() => useHasActiveBooking(validUserId1, validUserId2));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('ignores PGRST116 error (no rows found)', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    const { result } = renderHook(() => useHasActiveBooking(validUserId1, validUserId2));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasBooking).toBe(false);
    // PGRST116 should not trigger console.error
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('uses combined OR query for both directions', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    renderHook(() => useHasActiveBooking(validUserId1, validUserId2));

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    // Verify the query chain was called with correct methods
    const fromResult = (mockSupabase.from as jest.Mock).mock.results[0].value;
    expect(fromResult.select).toHaveBeenCalledWith('id');
  });

  it('cleans up on unmount to prevent state updates', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Create a delayed response
    mockMaybeSingle.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { id: 'booking-1' }, error: null }), 100)
        )
    );

    const { unmount } = renderHook(() => useHasActiveBooking(validUserId1, validUserId2));

    // Unmount before the promise resolves
    unmount();

    // Wait for the promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should not cause "Can't perform a React state update on an unmounted component" error
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('unmounted'));

    consoleErrorSpy.mockRestore();
  });
});
