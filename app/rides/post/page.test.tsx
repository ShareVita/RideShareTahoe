import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createClient } from '@/libs/supabase/client';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import type { RidePostType, Vehicle } from '@/app/community/types';
import CreateRidePage from './page';

const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    back: mockRouterBack,
  }),
}));

jest.mock('@/hooks/useProtectedRoute');
jest.mock('@/libs/supabase/client');

const mockRidePost: Partial<RidePostType> = {
  posting_type: 'driver',
  start_location: 'San Francisco, CA',
  end_location: 'South Lake Tahoe, CA',
  departure_date: '2025-12-20',
  departure_time: '09:30',
  price_per_seat: 45,
  available_seats: 3,
  description: 'Heading up for the weekend',
  special_instructions: 'Bring snacks',
  vehicle_id: 'v-123',
};

jest.mock('@/components/rides/RideForm', () => ({
  __esModule: true,
  default: function MockRideForm({
    onSave,
    onCancel,
    vehicles,
  }: {
    // eslint-disable-next-line no-unused-vars
    onSave: (_data: Partial<RidePostType>) => void;
    onCancel: () => void;
    vehicles: Vehicle[];
  }) {
    return (
      <div>
        <p>Mock Ride Form</p>
        <p>Vehicles Loaded: {vehicles?.length || 0}</p>
        <button type="button" onClick={() => onSave(mockRidePost)} data-testid="save-default">
          Save Ride
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              ...mockRidePost,
              is_round_trip: true,
              return_date: '2025-12-22',
              return_time: '14:00',
            })
          }
          data-testid="save-roundtrip"
        >
          Save Round Trip
        </button>
        <button type="button" onClick={onCancel}>
          Cancel Ride
        </button>
      </div>
    );
  },
}));

const mockedUseProtectedRoute = useProtectedRoute as jest.Mock;
const mockedCreateClient = createClient as jest.Mock;

describe('CreateRidePage', () => {
  const mockUser = { id: 'user-123' };
  let fromMock: jest.Mock;
  let insertMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush.mockReset();
    mockRouterBack.mockReset();

    mockedUseProtectedRoute.mockReturnValue({ user: mockUser, isLoading: false });

    insertMock = jest.fn().mockResolvedValue({ error: null });
    fromMock = jest.fn(() => ({ insert: insertMock }));

    mockedCreateClient.mockReturnValue({ from: fromMock });

    // Mock global fetch for vehicles
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            vehicles: [
              {
                id: 'v-123',
                make: 'Subaru',
                model: 'Outback',
                year: 2022,
                color: 'Blue',
                drivetrain: 'AWD',
              },
            ],
          }),
      })
    ) as jest.Mock;
  });

  it('shows spinner while authentication is loading', () => {
    mockedUseProtectedRoute.mockReturnValue({ user: null, isLoading: true });
    const { container } = render(<CreateRidePage />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Post a Ride/i })).not.toBeInTheDocument();
  });

  it('renders the form after auth resolves', () => {
    render(<CreateRidePage />);

    expect(screen.getByRole('heading', { name: /Post a Ride/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Share your journey or find a ride with the community./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Mock Ride Form/i)).toBeInTheDocument();
  });

  it('inserts ride data and redirects on successful save', async () => {
    render(<CreateRidePage />);

    // Wait for vehicles to be passed to the form
    await waitFor(() => {
      expect(screen.getByText('Vehicles Loaded: 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('save-default'));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/community');
    });

    expect(fromMock).toHaveBeenCalledWith('rides');
    expect(insertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          poster_id: mockUser.id,
          status: 'active',
          ...mockRidePost,
          // Verify dual-write fields
          total_seats: 3,
          has_awd: true,
          car_type: '2022 Subaru Outback (Blue)',
          // Verify privacy fields
          start_address_street: mockRidePost.start_location,
          end_address_street: mockRidePost.end_location,
        }),
      ])
    );
  });

  it('handles round trip creation correctly', async () => {
    render(<CreateRidePage />);

    // Wait for vehicles
    await waitFor(() => {
      expect(screen.getByText('Vehicles Loaded: 1')).toBeInTheDocument();
    });

    // Verify Round Trip Insertions
    fireEvent.click(screen.getByTestId('save-roundtrip'));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/community');
    });

    // Check last call to insert
    const lastCallArgs = insertMock.mock.calls[insertMock.mock.calls.length - 1][0];
    expect(lastCallArgs).toHaveLength(2); // Should be 2 records

    const [departureTrip, returnTrip] = lastCallArgs;

    // Verify Departure Trip has return info
    expect(departureTrip).toEqual(
      expect.objectContaining({
        trip_direction: 'departure',
        start_address_street: mockRidePost.start_location,
        return_date: '2025-12-22',
        return_time: '14:00',
      })
    );

    // Verify Return Trip has swapped addresses
    expect(returnTrip).toEqual(
      expect.objectContaining({
        trip_direction: 'return',
        start_address_street: mockRidePost.end_location,
        end_address_street: mockRidePost.start_location,
        return_date: mockRidePost.departure_date, // Mapped correctly
      })
    );
  });

  it('shows an error message when saving fails', async () => {
    insertMock.mockResolvedValueOnce({ error: new Error('boom') });
    render(<CreateRidePage />);

    fireEvent.click(screen.getByTestId('save-default'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to create ride/i)).toBeInTheDocument();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('calls router.back when cancel is clicked', () => {
    render(<CreateRidePage />);

    fireEvent.click(screen.getByRole('button', { name: /Cancel Ride/i }));

    expect(mockRouterBack).toHaveBeenCalled();
  });
});
