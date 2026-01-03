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

// Import the mocked createClient after mocking
import { createClient } from '@/libs/supabase/client';

const mockUser = { id: 'driver1' };
// Use future dates to ensure rides pass the date filter in the component
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
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
  {
    id: 'ride2', // Inactive ride
    posting_type: 'driver',
    status: 'completed',
    available_seats: 0,
    departure_date: '2025-01-01',
    departure_time: '08:00',
  },
];

describe('InviteToRideModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up createClient mock to return a new instance each time
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

  it('renders correctly when open', async () => {
    render(
      <InviteToRideModal
        isOpen={true}
        onClose={mockOnClose}
        passengerId="p1"
        passengerName="Alice"
        user={mockUser}
      />
    );

    // Wait for the ride list to load and verify content is displayed
    await screen.findByText('Ski Trip');
    expect(screen.getByText(/Invite Alice to Ride/i)).toBeInTheDocument();
    expect(screen.getByText('Ski Trip')).toBeInTheDocument();

    // inactive ride should not be shown
    expect(screen.queryByText('2025-01-01')).not.toBeInTheDocument();
  });

  it('selects a ride and sends invitation', async () => {
    render(
      <InviteToRideModal
        isOpen={true}
        onClose={mockOnClose}
        passengerId="p1"
        passengerName="Alice"
        user={mockUser}
      />
    );

    // Use findByText instead of waitFor + getBy
    const skiTripElement = await screen.findByText('Ski Trip');

    // Select ride
    fireEvent.click(skiTripElement);

    // Click Invite
    fireEvent.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Invited Alice'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows generic message if no rides available', async () => {
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
});
