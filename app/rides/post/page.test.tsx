import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createClient } from '@/lib/supabase/client';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import type { RidePostType } from '@/app/community/types';
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
jest.mock('@/lib/supabase/client');

const mockRidePost: Partial<RidePostType> = {
  posting_type: 'driver',
  start_location: 'San Francisco, CA',
  end_location: 'South Lake Tahoe, CA',
  departure_date: '2025-12-20',
  departure_time: '09:30',
  price_per_seat: 45,
  total_seats: 3,
  description: 'Heading up for the weekend',
  special_instructions: 'Bring snacks',
  has_awd: true,
};

jest.mock('@/components/rides/RideForm', () => ({
  __esModule: true,
  default: function MockRideForm({
    onSave,
    onCancel,
  }: {
    // eslint-disable-next-line no-unused-vars
    onSave: (_data: Partial<RidePostType>) => void;
    onCancel: () => void;
  }) {
    return (
      <div>
        <p>Mock Ride Form</p>
        <button type="button" onClick={() => onSave(mockRidePost)}>
          Save Ride
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

    fireEvent.click(screen.getByRole('button', { name: /Save Ride/i }));

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
        }),
      ])
    );
  });

  it('shows an error message when saving fails', async () => {
    insertMock.mockResolvedValueOnce({ error: new Error('boom') });
    render(<CreateRidePage />);

    fireEvent.click(screen.getByRole('button', { name: /Save Ride/i }));

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
