import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RidesTab } from './FindRidesTab';
import { fetchAllRides } from '@/libs/community/ridesData';
import type { RidePostType, LocationFilterType } from '../types';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';
import type { CommunityUser } from '@/app/community/types';

// Mock dependencies
jest.mock('@/libs/community/ridesData', () => ({
  fetchAllRides: jest.fn(),
}));

// Mock child components to simplify testing
jest.mock('./LocationFilters', () => ({
  LocationFilters: ({
    onDepartureFilterChange,
    onDestinationFilterChange,
  }: {
    // eslint-disable-next-line no-unused-vars
    onDepartureFilterChange: (_f: LocationFilterType) => void;
    // eslint-disable-next-line no-unused-vars
    onDestinationFilterChange: (_f: LocationFilterType) => void;
  }) => (
    <div data-testid="location-filters">
      <button
        onClick={() => onDepartureFilterChange({ lat: 10, lng: 20, radius: 25 })}
        data-testid="filter-dept"
      >
        Filter Dept
      </button>
      <button
        onClick={() => onDestinationFilterChange({ lat: 30, lng: 40, radius: 25 })}
        data-testid="filter-dest"
      >
        Filter Dest
      </button>
    </div>
  ),
}));

// Mock PostCard instead of RidePostCard
jest.mock('@/app/community/components/post-card/PostCard.refactored', () => ({
  PostCard: ({ post, onViewDetails }: { post: RidePostType; onViewDetails: () => void }) => (
    <div data-testid="post-card">
      <span data-testid={`post-${post.id}`}>{post.id}</span>
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

jest.mock('./PaginationControls', () => ({
  PaginationControls: ({
    onPageChange,
    currentPage,
  }: {
    // eslint-disable-next-line no-unused-vars
    onPageChange: (_p: number) => void;
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

describe('RidesTab', () => {
  const mockSupabase = {} as unknown as CommunitySupabaseClient;
  const mockUser = { id: 'user-1' } as unknown as CommunityUser;
  const mockOpenMessageModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  const mockRidesSuccess = (rides: RidePostType[], totalCount = 10, hasMore = false) => {
    (fetchAllRides as jest.Mock).mockResolvedValue({
      rides,
      totalCount,
      hasMore,
    });
  };

  it('should render loading state initially', async () => {
    // Return a promise that never resolves immediately to check loading state
    (fetchAllRides as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
    );

    expect(screen.getByText('Find a Ride')).toBeInTheDocument();
    // Check for pulse animation class or structure
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render empty state when no rides found', async () => {
    mockRidesSuccess([], 0);

    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
    );

    await waitFor(() => {
      expect(screen.getByText('No Rides Found')).toBeInTheDocument();
    });
  });

  it('should render rides when data is loaded', async () => {
    const rides = [
      { id: 'ride-1', departure_date: '2023-01-01', trip_direction: 'departure' },
      { id: 'ride-2', departure_date: '2023-01-02', trip_direction: 'return' },
    ] as unknown as RidePostType[];
    mockRidesSuccess(rides);

    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('post-card')).toHaveLength(2);
    });
    expect(screen.getByText('ride-1')).toBeInTheDocument();
  });

  it('should handle pagination', async () => {
    // 20 items, page size 10 (default) implies 2 pages
    // Must return at least one ride so we don't hit SectionEmpty
    const dummyRides = [
      { id: 'ride-p1', departure_date: '2025-01-01', trip_direction: 'departure' },
    ] as unknown as RidePostType[];
    mockRidesSuccess(dummyRides, 20);

    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
    );

    // Initial page
    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('next-page'));

    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });
  });

  it('should reset to page 1 when filters change', async () => {
    const dummyRides = [
      { id: 'ride-f1', departure_date: '2025-01-01', trip_direction: 'departure' },
    ] as unknown as RidePostType[];
    // Ensure we have enough data (totalCount) to allow page 2
    mockRidesSuccess(dummyRides, 20);

    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
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
    fireEvent.click(screen.getByTestId('filter-dept'));

    // Should reset to page 1
    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });
  });

  it('should handle error state', async () => {
    (fetchAllRides as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load rides. Please try again later.')).toBeInTheDocument();
    });
  });

  it('should group round trips correctly', async () => {
    const rides = [
      {
        id: 'ride-1',
        departure_date: '2023-01-01',
        trip_direction: 'departure',
        round_trip_group_id: 'group-1',
      },
      {
        id: 'ride-2',
        departure_date: '2023-01-05',
        trip_direction: 'return', // Return leg should be merged into departure
        round_trip_group_id: 'group-1',
      },
      {
        id: 'ride-3',
        departure_date: '2023-01-02',
        trip_direction: 'departure',
        round_trip_group_id: null,
      },
    ] as unknown as RidePostType[];

    mockRidesSuccess(rides);

    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
    );

    await waitFor(() => {
      const cards = screen.getAllByTestId('post-card');
      // Should result in 2 cards: group-1 (merged) and ride-3
      expect(cards).toHaveLength(2);
    });
  });

  it('should open post detail modal when view details clicked', async () => {
    const rides = [
      { id: 'ride-1', departure_date: '2023-01-01', trip_direction: 'departure' },
    ] as unknown as RidePostType[];
    mockRidesSuccess(rides);

    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-card')).toBeInTheDocument();
    });

    // Modal should not be visible initially
    expect(screen.queryByTestId('post-detail-modal')).not.toBeInTheDocument();

    // Click view details
    fireEvent.click(screen.getByTestId('view-details-ride-1'));

    // Wait for modal to appear (uses setTimeout)
    await screen.findByTestId('post-detail-modal');
    expect(screen.getByTestId('post-detail-modal')).toBeInTheDocument();
  });
});
