import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PassengersSection } from './PassengersSection';
import { fetchPassengerRides } from '@/libs/community/ridesData';
import type { RidePostType, LocationFilterType, ProfileType } from '../../types';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';

// Mocks
jest.mock('@/libs/community/ridesData', () => ({
  fetchPassengerRides: jest.fn(),
}));

// Mock PostCard instead of PassengerPostCard
jest.mock('@/app/community/components/post-card/PostCard.refactored', () => ({
  PostCard: ({
    post,
    onMessage,
    onViewDetails,
  }: {
    post: RidePostType;
    // eslint-disable-next-line no-unused-vars
    onMessage: (_recipient: ProfileType, _post: RidePostType) => void;
    onViewDetails: () => void;
  }) => (
    <div data-testid="post-card">
      <span data-testid={`post-${post.id}`}>{post.id}</span>
      <button onClick={() => onMessage({ id: 'owner' } as ProfileType, post)}>Message</button>
      <button onClick={onViewDetails} data-testid={`view-details-${post.id}`}>
        View Details
      </button>
    </div>
  ),
}));

// Mock PostDetailModal
jest.mock('@/app/community/components/PostDetailModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="post-detail-modal">
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock('../PaginationControls', () => ({
  PaginationControls: ({
    onPageChange,
    currentPage,
  }: {
    // eslint-disable-next-line no-unused-vars
    onPageChange: (_page: number) => void;
    currentPage: number;
  }) => (
    <div data-testid="pagination">
      Page {currentPage}
      <button onClick={() => onPageChange(currentPage + 1)} data-testid="next-page">
        Next
      </button>
    </div>
  ),
}));

jest.mock('../LocationFilters', () => ({
  LocationFilters: ({
    onDepartureFilterChange,
  }: {
    // eslint-disable-next-line no-unused-vars
    onDepartureFilterChange: (_filter: LocationFilterType) => void;
  }) => (
    <button
      onClick={() => onDepartureFilterChange({ lat: 1, lng: 1, radius: 25 })}
      data-testid="filter-btn"
    >
      Filter
    </button>
  ),
}));

describe('PassengersSection', () => {
  const mockSupabase = {} as unknown as CommunitySupabaseClient;
  const mockUser = { id: 'u1' };
  const mockOpenMessageModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  const mockSuccess = (rides: RidePostType[], totalCount = 10) => {
    (fetchPassengerRides as jest.Mock).mockResolvedValue({
      rides,
      totalCount,
      hasMore: totalCount > rides.length,
    });
  };

  it('should render loading state', async () => {
    (fetchPassengerRides as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );
    // Check for loading skeleton animations
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('scrolls and calls fetch on pagination', async () => {
    mockSuccess([{ id: 'r1', departure_date: '2023-01-01' }] as unknown as RidePostType[], 20);
    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('next-page'));

    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });

    expect(globalThis.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('fetches with filter', async () => {
    mockSuccess([{ id: 'r1', departure_date: '2023-01-01' }] as unknown as RidePostType[], 1);
    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    await waitFor(() => expect(screen.getByTestId('post-card')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('filter-btn'));

    await waitFor(() => {
      expect(fetchPassengerRides).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          departureFilter: expect.objectContaining({ lat: 1 }),
        })
      );
    });
  });

  it('handles empty state', async () => {
    mockSuccess([], 0);
    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No passengers looking right now')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    (fetchPassengerRides as jest.Mock).mockRejectedValue(new Error('Fail'));
    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Passengers Looking for Rides')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load passenger requests/)).toBeInTheDocument();
    });
  });

  it('renders passenger posts correctly', async () => {
    const rides = [
      { id: 'passenger-1', departure_date: '2023-01-01', posting_type: 'passenger' },
      { id: 'passenger-2', departure_date: '2023-01-02', posting_type: 'passenger' },
    ] as unknown as RidePostType[];
    mockSuccess(rides, 2);

    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    await waitFor(() => {
      const cards = screen.getAllByTestId('post-card');
      expect(cards).toHaveLength(2);
    });

    expect(screen.getByText('passenger-1')).toBeInTheDocument();
    expect(screen.getByText('passenger-2')).toBeInTheDocument();
  });

  it('should open post detail modal when view details clicked', async () => {
    mockSuccess(
      [{ id: 'passenger-1', departure_date: '2023-01-01' }] as unknown as RidePostType[],
      1
    );

    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-card')).toBeInTheDocument();
    });

    // Modal should not be visible initially
    expect(screen.queryByTestId('post-detail-modal')).not.toBeInTheDocument();

    // Click view details
    fireEvent.click(screen.getByTestId('view-details-passenger-1'));

    // Wait for modal to appear (uses setTimeout)
    await screen.findByTestId('post-detail-modal');
    expect(screen.getByTestId('post-detail-modal')).toBeInTheDocument();
  });

  it('should close post detail modal', async () => {
    mockSuccess(
      [{ id: 'passenger-1', departure_date: '2023-01-01' }] as unknown as RidePostType[],
      1
    );

    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-card')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByTestId('view-details-passenger-1'));
    await screen.findByTestId('post-detail-modal');

    // Close modal
    fireEvent.click(screen.getByTestId('close-modal'));
    expect(screen.queryByTestId('post-detail-modal')).not.toBeInTheDocument();
  });

  it('resets to page 1 when filters change', async () => {
    mockSuccess(
      [{ id: 'passenger-1', departure_date: '2023-01-01' }] as unknown as RidePostType[],
      20
    );

    render(
      <PassengersSection
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    // Initial page 1
    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });

    // Go to page 2
    fireEvent.click(screen.getByTestId('next-page'));
    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });

    // Apply filter
    fireEvent.click(screen.getByTestId('filter-btn'));

    // Should reset to page 1
    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });
  });
});
