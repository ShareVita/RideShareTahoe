import { renderHook, waitFor } from '@testing-library/react';
import { useVehicles, useVehiclesOnce } from './useVehicles';

// Mock fetch
global.fetch = jest.fn();

const mockVehicles = [
  {
    id: 'vehicle-1',
    user_id: 'user-1',
    year: 2020,
    make: 'Toyota',
    model: 'Camry',
    color: 'Blue',
    license_plate: 'ABC123',
    has_awd: false,
  },
  {
    id: 'vehicle-2',
    user_id: 'user-1',
    year: 2022,
    make: 'Subaru',
    model: 'Outback',
    color: 'White',
    license_plate: 'XYZ789',
    has_awd: true,
  },
];

describe('useVehicles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty vehicles when userId is null', async () => {
    const { result } = renderHook(() => useVehicles(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vehicles).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches vehicles successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vehicles: mockVehicles }),
    });

    const { result } = renderHook(() => useVehicles('user-1'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vehicles).toEqual(mockVehicles);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/community/vehicles');
  });

  it('handles fetch error gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useVehicles('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vehicles).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Server error');
  });

  it('handles network error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useVehicles('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vehicles).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('refetches when userId changes', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ vehicles: mockVehicles }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ vehicles: [] }),
      });

    const { result, rerender } = renderHook(({ userId }) => useVehicles(userId), {
      initialProps: { userId: 'user-1' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vehicles).toEqual(mockVehicles);

    // Change userId
    rerender({ userId: 'user-2' });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('provides refetch function', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ vehicles: [mockVehicles[0]] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ vehicles: mockVehicles }),
      });

    const { result } = renderHook(() => useVehicles('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vehicles).toHaveLength(1);

    // Call refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.vehicles).toHaveLength(2);
    });
  });

  it('handles empty response gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useVehicles('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vehicles).toEqual([]);
  });
});

describe('useVehiclesOnce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty vehicles when userId is null', async () => {
    const { result } = renderHook(() => useVehiclesOnce(null));

    expect(result.current.vehicles).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches vehicles only once', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ vehicles: mockVehicles }),
    });

    const { result, rerender } = renderHook(({ userId }) => useVehiclesOnce(userId), {
      initialProps: { userId: 'user-1' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vehicles).toEqual(mockVehicles);
    expect(fetch).toHaveBeenCalledTimes(1);

    // Rerender with same userId
    rerender({ userId: 'user-1' });

    // Should not fetch again
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when userId changes after initial fetch', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ vehicles: mockVehicles }),
    });

    const { result, rerender } = renderHook(({ userId }) => useVehiclesOnce(userId), {
      initialProps: { userId: 'user-1' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change userId
    rerender({ userId: 'user-2' });

    // Should still only have one fetch call
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
