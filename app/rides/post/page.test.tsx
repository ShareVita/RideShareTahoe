import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateRidePage from './page';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import type { RidePostType } from '@/app/community/types';
import { RIDE_DRAFT_KEY } from '@/components/vehicles/rideDraft';

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
  default: ({
    onSave,
    initialData,
    initialVehicleId,
  }: {
    // eslint-disable-next-line no-unused-vars
    onSave: (data: Partial<RidePostType>) => Promise<void>;
    initialData: Partial<RidePostType>;
    initialVehicleId?: string;
  }) => (
    <div>
      <input aria-label="Draft title" readOnly value={initialData.title || ''} />
      <input aria-label="Draft vehicle" readOnly value={initialVehicleId || ''} />
      <button onClick={() => onSave(mockData)}>Save fixture</button>
    </div>
  ),
}));

describe('ride creation persistence', () => {
  const insert = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    window.scrollTo = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ vehicles: [] }) });
    insert.mockResolvedValue({ error: null });
    (createClient as jest.Mock).mockReturnValue({ from: () => ({ insert }) });
  });
  it('persists outbound coordinates and swaps both axes for the return leg', async () => {
    render(<CreateRidePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save fixture' }));
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
    expect(await screen.findByRole('status')).toHaveTextContent('Your round trip is posted');
    expect(screen.getByRole('link', { name: 'View My Posts' })).toHaveAttribute(
      'href',
      '/community?view=my-posts'
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
  it('reports a mapping warning only after a successful post', async () => {
    const originalLat = mockData.start_lat;
    mockData.start_lat = null;
    try {
      render(<CreateRidePage />);
      await userEvent.click(await screen.findByRole('button', { name: 'Save fixture' }));
      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.stringContaining('Ride posted.'),
          expect.anything()
        )
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        'One or more locations could not be mapped'
      );
    } finally {
      mockData.start_lat = originalLat;
    }
  });
  it('keeps the form and draft on an insert failure, without claiming success', async () => {
    insert.mockResolvedValue({ error: new Error('Insert failed') });
    sessionStorage.setItem(
      RIDE_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'driver',
        data: { title: 'Saved draft' },
        vehicleId: 'new-vehicle',
      })
    );
    render(<CreateRidePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save fixture' }));
    expect(await screen.findByText('Failed to create ride. Please try again.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(RIDE_DRAFT_KEY)).not.toBeNull();
  });
  it.each(['driver', 'other-user'])('restores a draft only for its owner (%s)', async (ownerId) => {
    sessionStorage.setItem(
      RIDE_DRAFT_KEY,
      JSON.stringify({ ownerId, data: { title: 'Saved draft' }, vehicleId: 'new-vehicle' })
    );
    render(<CreateRidePage />);
    expect(await screen.findByLabelText('Draft title')).toHaveValue(
      ownerId === 'driver' ? 'Saved draft' : ''
    );
    expect(screen.getByLabelText('Draft vehicle')).toHaveValue(
      ownerId === 'driver' ? 'new-vehicle' : ''
    );
  });
});
