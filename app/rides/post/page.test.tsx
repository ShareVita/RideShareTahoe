import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateRidePage from './page';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import type { RidePostType } from '@/app/community/types';

const mockPush = jest.fn();
const mockData: Partial<RidePostType> = {
  posting_type: 'driver',
  title: 'Round trip',
  start_location: 'Truckee',
  end_location: 'San Francisco',
  start_lat: 39.3279,
  start_lng: -120.1833,
  end_lat: 37.7749,
  end_lng: -122.4194,
  departure_date: '2026-12-20',
  departure_time: '08:00',
  return_date: '2026-12-21',
  return_time: '14:00',
  is_round_trip: true,
  total_seats: 3,
};
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('@/hooks/useProtectedRoute', () => ({
  useProtectedRoute: () => ({ user: { id: 'driver' }, isLoading: false }),
}));
jest.mock('@/lib/supabase/client', () => ({ createClient: jest.fn() }));
jest.mock('react-hot-toast', () => ({ toast: jest.fn() }));
jest.mock('@/components/rides/RideForm', () => ({
  __esModule: true,
  // eslint-disable-next-line no-unused-vars
  default: ({ onSave }: { onSave: (data: Partial<RidePostType>) => Promise<void> }) => (
    <button onClick={() => onSave(mockData)}>Save fixture</button>
  ),
}));

describe('ride creation persistence', () => {
  const insert = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ vehicles: [] }) });
    insert.mockResolvedValue({ error: null });
    (createClient as jest.Mock).mockReturnValue({ from: () => ({ insert }) });
  });
  it('persists outbound coordinates and swaps both axes for the return leg', async () => {
    render(<CreateRidePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Save fixture' }));
    await waitFor(() =>
      expect(insert).toHaveBeenCalledWith([
        expect.objectContaining({
          start_lat: 39.3279,
          start_lng: -120.1833,
          end_lat: 37.7749,
          end_lng: -122.4194,
        }),
        expect.objectContaining({
          start_location: 'San Francisco',
          end_location: 'Truckee',
          start_lat: 37.7749,
          start_lng: -122.4194,
          end_lat: 39.3279,
          end_lng: -120.1833,
        }),
      ])
    );
    expect(mockPush).toHaveBeenCalledWith('/community');
    expect(toast).not.toHaveBeenCalled();
  });
  it('reports a mapping warning only after a successful post', async () => {
    const originalLat = mockData.start_lat;
    mockData.start_lat = null;
    try {
      render(<CreateRidePage />);
      await userEvent.click(screen.getByRole('button', { name: 'Save fixture' }));
      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.stringContaining('Ride posted.'),
          expect.anything()
        )
      );
      expect(mockPush).toHaveBeenCalledWith('/community');
    } finally {
      mockData.start_lat = originalLat;
    }
  });
});
