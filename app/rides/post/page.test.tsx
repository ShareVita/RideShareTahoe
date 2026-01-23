import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
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

// Mock useVehicles hook
jest.mock('@/hooks/useVehicles', () => ({
  useVehicles: jest.fn(() => ({
    vehicles: [],
    loading: false,
    error: null,
  })),
}));

const mockRidePost: Partial<RidePostType> = {
  posting_type: 'driver',
  start_location: 'San Francisco, CA',
  end_location: 'South Lake Tahoe, CA',
  departure_date: '2025-12-20',
  departure_time: '09:30',
  price_per_seat: 45,
  total_seats: 3,
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

// Mock SeriesCreatedModal to auto-navigate on success
jest.mock('@/components/rides/SeriesCreatedModal', () => ({
  __esModule: true,
  default: function MockSeriesCreatedModal({
    isOpen,
    onViewRides,
  }: {
    isOpen: boolean;
    onViewRides: () => void;
  }) {
    if (!isOpen) return null;
    // Auto-click view rides on render to simulate user clicking
    setTimeout(() => onViewRides(), 0);
    return <div data-testid="success-modal">Success Modal</div>;
  },
}));

const mockedUseProtectedRoute = useProtectedRoute as jest.Mock;

describe('CreateRidePage', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseProtectedRoute.mockReturnValue({ user: mockUser, isLoading: false });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, id: 'ride-1' }),
    });
  });

  it('shows loading spinner while authenticating', () => {
    mockedUseProtectedRoute.mockReturnValue({ user: null, isLoading: true });
    const { container } = render(<CreateRidePage />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders form after auth resolves', () => {
    render(<CreateRidePage />);

    expect(screen.getByRole('heading', { name: /Post a Ride/i })).toBeInTheDocument();
    expect(screen.getByText(/Mock Ride Form/i)).toBeInTheDocument();
  });

  it('posts ride and shows success modal', async () => {
    render(<CreateRidePage />);

    fireEvent.click(screen.getByRole('button', { name: /Save Ride/i }));

    await waitFor(() => {
      expect(screen.getByTestId('success-modal')).toBeInTheDocument();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/rides',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockRidePost),
      })
    );

    // The mock modal auto-navigates
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/community?view=my-posts');
    });
  });

  it('shows error message when save fails', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Database error' }),
    });

    render(<CreateRidePage />);
    fireEvent.click(screen.getByRole('button', { name: /Save Ride/i }));

    await waitFor(() => {
      expect(screen.getByText(/Database error/i)).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<CreateRidePage />);
    fireEvent.click(screen.getByRole('button', { name: /Save Ride/i }));

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('calls router.back when cancel clicked', () => {
    render(<CreateRidePage />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel Ride/i }));

    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('returns null when user not authenticated', () => {
    mockedUseProtectedRoute.mockReturnValue({ user: null, isLoading: false });
    const { container } = render(<CreateRidePage />);

    expect(container.firstChild).toBeNull();
  });
});
