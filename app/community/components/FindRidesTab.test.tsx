import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RidesTab } from './FindRidesTab';
import { PassengersSection } from './passengers/PassengersSection';
import { fetchAllRides, fetchPassengerRides } from '@/libs/community/ridesData';
import { geocodeLocation } from '@/libs/geocoding';
import type { RidePostType } from '../types';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';
import type { CommunityUser } from '@/app/community/types';

// Mock dependencies
jest.mock('@/libs/community/ridesData', () => ({
  fetchAllRides: jest.fn(),
  fetchPassengerRides: jest.fn(),
}));

jest.mock('@/libs/geocoding', () => ({
  geocodeLocation: jest.fn(),
}));

// Keep the real filter controls so tests exercise their state across result changes.
jest.mock('./rides-posts/RidePostCard', () => ({
  RidePostCard: ({
    post,
    onMessage,
  }: {
    post: RidePostType;
    // eslint-disable-next-line no-unused-vars
    onMessage: (_reply: CommunityUser, _postKey: keyof RidePostType) => void;
  }) => (
    <div data-testid="ride-card">
      {post.id}
      <button onClick={() => onMessage({ id: 'owner' }, post.id as keyof RidePostType)}>
        Message
      </button>
    </div>
  ),
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
    (geocodeLocation as jest.Mock).mockResolvedValue({ lat: 10, lng: 20 });
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
      expect(screen.getAllByTestId('ride-card')).toHaveLength(2);
    });
    expect(screen.getByText('ride-1')).toBeInTheDocument();
  });

  it('retains the destination query and radius when a search returns matching rides', async () => {
    const result = {
      rides: [{ id: 'truckee-ride', departure_date: '2026-11-01' }] as RidePostType[],
      totalCount: 1,
      hasMore: false,
    };
    (fetchAllRides as jest.Mock).mockResolvedValue(result);
    render(
      <RidesTab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
    );
    await screen.findByText('truckee-ride');
    fireEvent.change(screen.getByLabelText('Destination Location'), {
      target: { value: 'Truckee' },
    });
    fireEvent.change(screen.getAllByRole('slider')[1], { target: { value: '40' } });
    // eslint-disable-next-line no-unused-vars
    let resolveSearch!: (value: typeof result) => void;
    (fetchAllRides as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        })
    );
    fireEvent.click(screen.getByRole('button', { name: /search destination/i }));
    await screen.findByText('Loading rides...');
    expect(screen.getByLabelText('Destination Location')).toHaveValue('Truckee');
    await act(async () => resolveSearch(result));
    await screen.findByText('truckee-ride');
    expect(screen.getByLabelText('Destination Location')).toHaveValue('Truckee');
    expect(screen.getAllByRole('slider')[1]).toHaveValue('40');
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText('Departure Location'), { target: { value: 'Truckee' } });
    fireEvent.click(screen.getByRole('button', { name: /search departure/i }));

    // Should reset to page 1
    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Departure Location')).toHaveValue('Truckee');
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
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
      const cards = screen.getAllByTestId('ride-card');
      // Should result in 2 cards: group-1 (merged) and ride-3
      expect(cards).toHaveLength(2);
    });
  });

  it.each([
    ['rides', RidesTab, fetchAllRides, 'No rides match your filters', 'No Rides Found'],
    [
      'requests',
      PassengersSection,
      fetchPassengerRides,
      'No requests match your filters',
      'No passengers looking right now',
    ],
  ] as const)(
    'keeps %s search recoverable through loading, errors, no matches, and clearing',
    async (_kind, Tab, fetchRides, noMatches, noInventory) => {
      const empty = { rides: [], totalCount: 0, hasMore: false };
      const fetchMock = fetchRides as jest.Mock;
      fetchMock.mockResolvedValue(empty);
      render(
        <Tab user={mockUser} supabase={mockSupabase} openMessageModal={mockOpenMessageModal} />
      );
      await screen.findByText(noInventory);

      const input = screen.getByLabelText('Departure Location');
      const radius = screen.getAllByRole('slider')[0];
      fireEvent.change(input, { target: { value: 'Los Angeles, CA' } });
      fireEvent.change(radius, { target: { value: '60' } });

      // eslint-disable-next-line no-unused-vars
      let resolveSearch!: (value: typeof empty) => void;
      fetchMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSearch = resolve;
          })
      );
      fireEvent.click(screen.getByRole('button', { name: /search departure/i }));
      await screen.findByText(`Loading ${_kind}...`);
      expect(screen.getByLabelText('Departure Location')).toHaveValue('Los Angeles, CA');
      expect(screen.getAllByRole('slider')[0]).toHaveValue('60');
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();

      await act(async () => resolveSearch(empty));
      await screen.findByText(noMatches);
      expect(screen.queryByText(/Be the first/)).not.toBeInTheDocument();
      expect(screen.getByLabelText('Departure Location')).toHaveValue('Los Angeles, CA');
      expect(screen.getAllByRole('slider')[0]).toHaveValue('60');

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockRejectedValueOnce(new Error('Network unavailable'));
      fireEvent.change(radius, { target: { value: '65' } });
      await screen.findByText(/Failed to load/);
      expect(screen.getByLabelText('Departure Location')).toHaveValue('Los Angeles, CA');
      expect(screen.getAllByRole('slider')[0]).toHaveValue('65');
      expect(screen.queryByText(/0 .* available/)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      await screen.findByText(noMatches);
      consoleError.mockRestore();
      fireEvent.click(screen.getByRole('button', { name: /clear/i }));
      await screen.findByText(noInventory);
      expect(screen.getByLabelText('Departure Location')).toHaveValue('');
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Be the first/)).toBeInTheDocument();
    }
  );
});
