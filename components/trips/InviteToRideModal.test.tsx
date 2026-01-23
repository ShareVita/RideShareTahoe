import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InviteToRideModal from './InviteToRideModal';
import { fetchMyRides } from '@/libs/community/ridesData';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('@/libs/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/libs/community/ridesData', () => ({
  fetchMyRides: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { createClient } from '@/libs/supabase/client';

const mockUser = { id: 'driver1' };

// Use future dates
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);
const futureDateString = futureDate.toISOString().split('T')[0];

const mockRides = [
  {
    id: 'ride1',
    posting_type: 'driver',
    status: 'active',
    available_seats: 3,
    start_location: 'San Francisco',
    end_location: 'Tahoe',
    departure_date: futureDateString,
    departure_time: '08:00',
    title: 'Ski Trip',
  },
];

describe('InviteToRideModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        insert: jest.fn(() => ({ error: null })),
      })),
    });

    (globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    (fetchMyRides as jest.Mock).mockResolvedValue(mockRides);
  });

  it('renders and allows sending invitation', async () => {
    render(
      <InviteToRideModal
        isOpen={true}
        onClose={mockOnClose}
        passengerId="p1"
        passengerName="Alice"
        user={mockUser}
      />
    );

    const skiTripButton = await screen.findByText('Ski Trip');
    fireEvent.click(skiTripButton);

    const inviteButton = await screen.findByRole('button', { name: /^Invite$/i });
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('disables invite button when multiple rides available', async () => {
    (fetchMyRides as jest.Mock).mockResolvedValue([
      mockRides[0],
      { ...mockRides[0], id: 'ride2', title: 'Weekend Trip' },
    ]);

    render(
      <InviteToRideModal
        isOpen={true}
        onClose={mockOnClose}
        passengerId="p1"
        passengerName="Alice"
        user={mockUser}
      />
    );

    await screen.findByText('Ski Trip');
    const inviteButton = screen.getByRole('button', { name: /^Invite$/i });
    expect(inviteButton).toBeDisabled();
  });

  it('auto-selects when only one ride available', async () => {
    render(
      <InviteToRideModal
        isOpen={true}
        onClose={mockOnClose}
        passengerId="p1"
        passengerName="Alice"
        user={mockUser}
      />
    );

    await screen.findByText('Ski Trip');
    const inviteButton = screen.getByRole('button', { name: /^Invite$/i });
    expect(inviteButton).not.toBeDisabled();
  });

  it('shows message when no rides available', async () => {
    (fetchMyRides as jest.Mock).mockResolvedValue([]);

    render(
      <InviteToRideModal
        isOpen={true}
        onClose={mockOnClose}
        passengerId="p1"
        passengerName="Alice"
        user={mockUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/You don't have any suitable active rides/i)).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Booking error' }),
    });

    render(
      <InviteToRideModal
        isOpen={true}
        onClose={mockOnClose}
        passengerId="p1"
        passengerName="Alice"
        user={mockUser}
      />
    );

    const skiTripButton = await screen.findByText('Ski Trip');
    fireEvent.click(skiTripButton);

    const inviteButton = screen.getByRole('button', { name: /^Invite$/i });
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('filters out past and invalid rides', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    (fetchMyRides as jest.Mock).mockResolvedValue([
      mockRides[0],
      {
        ...mockRides[0],
        id: 'past',
        departure_date: pastDate.toISOString().split('T')[0],
        title: 'Past',
      },
      { ...mockRides[0], id: 'passenger', posting_type: 'passenger', title: 'Passenger' },
      { ...mockRides[0], id: 'full', available_seats: 0, title: 'Full' },
    ]);

    render(
      <InviteToRideModal
        isOpen={true}
        onClose={mockOnClose}
        passengerId="p1"
        passengerName="Alice"
        user={mockUser}
      />
    );

    await screen.findByText('Ski Trip');
    expect(screen.queryByText('Past')).not.toBeInTheDocument();
    expect(screen.queryByText('Passenger')).not.toBeInTheDocument();
    expect(screen.queryByText('Full')).not.toBeInTheDocument();
  });
});
