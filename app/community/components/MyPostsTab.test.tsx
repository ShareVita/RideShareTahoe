import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyPostsTab } from './MyPostsTab';
import type { RidePostType } from '../types';

// Mock Next.js navigation
const mockRouterPush = jest.fn();
const mockRouterRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    refresh: mockRouterRefresh,
  }),
}));

// Mock the modal components
jest.mock('@/components/rides/ScopeSelectionModal', () => {
  return function MockScopeSelectionModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
    variant,
  }: {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line no-unused-vars
    onConfirm: (scope: 'single' | 'future' | 'all') => void;
    isLoading?: boolean;
    variant: 'delete' | 'edit';
  }) {
    if (!isOpen) return null;
    const testId = variant === 'delete' ? 'delete-scope-modal' : 'edit-scope-modal';
    return (
      <div data-testid={testId}>
        <button onClick={onClose}>Cancel {variant === 'delete' ? 'Delete' : 'Edit'}</button>
        <button onClick={() => onConfirm('single')} disabled={isLoading}>
          {variant === 'delete' ? 'Delete' : 'Edit'} Single
        </button>
        <button onClick={() => onConfirm('all')} disabled={isLoading}>
          {variant === 'delete' ? 'Delete' : 'Edit'} All
        </button>
      </div>
    );
  };
});

jest.mock('@/components/rides/SeriesViewModal', () => {
  return function MockSeriesViewModal({
    isOpen,
    onClose,
    rides,
  }: {
    isOpen: boolean;
    onClose: () => void;
    rides: RidePostType[];
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="series-view-modal">
        <span>Series has {rides.length} rides</span>
        <button onClick={onClose}>Close Series View</button>
      </div>
    );
  };
});

describe('MyPostsTab', () => {
  const mockDeletePost = jest.fn().mockResolvedValue(undefined);

  const createMockRide = (overrides: Partial<RidePostType> = {}): RidePostType =>
    ({
      id: '1',
      title: 'Test Ride',
      poster_id: 'user-1',
      departure_date: '2025-01-15',
      departure_time: '10:00:00',
      start_location: 'San Francisco',
      end_location: 'Lake Tahoe',
      posting_type: 'driver',
      status: 'active',
      created_at: '2025-01-01T00:00:00Z',
      ...overrides,
    }) as RidePostType;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should render empty state when no rides', () => {
      render(<MyPostsTab myRides={[]} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText(/You haven't posted any rides yet/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Create New Post/i })).toHaveAttribute(
        'href',
        '/rides/post'
      );
    });
  });

  describe('Single Rides', () => {
    it('should render list of rides and summary', () => {
      const rides = [
        createMockRide({
          id: '1',
          created_at: '2025-01-01T00:00:00Z',
          title: 'Ride 1',
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          created_at: '2025-01-02T00:00:00Z',
          title: 'Ride 2',
          departure_date: '2025-01-16',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText('2 rides')).toBeInTheDocument();
      expect(screen.getByText('Ride 1')).toBeInTheDocument();
      expect(screen.getByText('Ride 2')).toBeInTheDocument();
    });

    it('should display correct posting type badges', () => {
      const rides = [
        createMockRide({ id: '1', posting_type: 'driver', departure_date: '2025-01-15' }),
        createMockRide({ id: '2', posting_type: 'passenger', departure_date: '2025-01-16' }),
        createMockRide({ id: '3', posting_type: 'flexible', departure_date: '2025-01-17' }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getAllByText('Driver')).toHaveLength(1);
      expect(screen.getAllByText('Passenger')).toHaveLength(1);
      expect(screen.getAllByText('Flexible')).toHaveLength(1);
    });

    it('should display route information', () => {
      const rides = [
        createMockRide({
          start_location: 'Sacramento',
          end_location: 'Reno',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText('Sacramento')).toBeInTheDocument();
      expect(screen.getByText('Reno')).toBeInTheDocument();
    });

    it('should display price and seats for driver posts', () => {
      const rides = [
        createMockRide({
          posting_type: 'driver',
          price_per_seat: 25,
          total_seats: 3,
          available_seats: 2,
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText('$25')).toBeInTheDocument();
      expect(screen.getByText('2 seats left')).toBeInTheDocument();
    });

    it('should display formatted departure time', () => {
      const rides = [
        createMockRide({
          departure_date: '2025-01-15',
          departure_time: '14:30:00', // 2:30 PM
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText(/2:30 PM/)).toBeInTheDocument();
    });

    it('should handle missing departure time gracefully', () => {
      const rides = [
        createMockRide({
          departure_time: null as unknown as string,
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      // Component should render without crashing
      expect(screen.getByText('Test Ride')).toBeInTheDocument();
    });

    it('should display vehicle information for driver posts', () => {
      const rides = [
        createMockRide({
          posting_type: 'driver',
          car_type: '2020 Toyota Camry (Blue) - AWD',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText(/2020 Toyota Camry/)).toBeInTheDocument();
    });

    it('should display description when provided', () => {
      const rides = [
        createMockRide({
          description: 'Looking for travel companions for a ski trip!',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText(/Looking for travel companions/)).toBeInTheDocument();
    });
  });

  describe('Round Trips', () => {
    it('should group round trips together', () => {
      const rides = [
        createMockRide({
          id: '1',
          created_at: '2025-01-01T00:00:00Z',
          round_trip_group_id: 'g1',
          trip_direction: 'departure',
          departure_date: '2025-01-15',
          departure_time: '10:00:00',
        }),
        createMockRide({
          id: '2',
          created_at: '2025-01-01T00:00:00Z',
          round_trip_group_id: 'g1',
          trip_direction: 'return',
          departure_date: '2025-01-17',
          departure_time: '16:00:00',
        }),
        createMockRide({
          id: '3',
          created_at: '2025-01-02T00:00:00Z',
          title: 'Single Ride',
          departure_date: '2025-01-18',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      // Should filter out return legs, showing 2 rides: one departure + one single ride
      expect(screen.getByText('2 rides')).toBeInTheDocument();
      expect(screen.getByText('Single Ride')).toBeInTheDocument();
    });

    it('should display Round Trip badge for grouped trips', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'g1',
          trip_direction: 'departure',
          departure_date: '2025-01-15',
          departure_time: '10:00:00',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'g1',
          trip_direction: 'return',
          departure_date: '2025-01-17',
          departure_time: '16:00:00',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      // Round trips show "Round Trip" in multiple places (badge and section header)
      const roundTripElements = screen.getAllByText('Round Trip');
      expect(roundTripElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display both departure and return times', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'g1',
          trip_direction: 'departure',
          departure_date: '2025-01-15',
          departure_time: '10:00:00',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'g1',
          trip_direction: 'return',
          departure_date: '2025-01-17',
          departure_time: '16:00:00',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      // Should show both departure and return
      expect(screen.getByText(/10:00 AM/)).toBeInTheDocument();
      expect(screen.getByText(/4:00 PM/)).toBeInTheDocument();
    });
  });

  describe('Multi-date Series', () => {
    it('should group multi-date series', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          trip_direction: 'departure',
          departure_date: '2025-01-15',
          departure_time: '10:00:00',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          trip_direction: 'departure',
          departure_date: '2025-01-22',
          departure_time: '10:00:00',
        }),
        createMockRide({
          id: '3',
          round_trip_group_id: 'series1',
          is_recurring: true,
          trip_direction: 'departure',
          departure_date: '2025-01-29',
          departure_time: '10:00:00',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      // Each ride is displayed individually (they share a group but are still separate cards)
      expect(screen.getByText('3 rides')).toBeInTheDocument();
      // They should show "Recurring" badge
      expect(screen.getAllByText('Recurring')).toHaveLength(3);
    });

    it('should display all dates in a series', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-15',
          departure_time: '10:00:00',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-22',
          departure_time: '10:00:00',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      // Both dates should be visible (one per card)
      expect(screen.getByText(/January 15, 2025/)).toBeInTheDocument();
      expect(screen.getByText(/January 22, 2025/)).toBeInTheDocument();
    });

    it('should show "View series" link for multi-date series', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-22',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      // Each card should have a "View full series" button
      const viewSeriesButtons = screen.getAllByRole('button', { name: /View full series/i });
      expect(viewSeriesButtons).toHaveLength(2);
    });

    it('should open series view modal when clicking view series link', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-22',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const viewSeriesButtons = screen.getAllByRole('button', { name: /View full series/i });
      fireEvent.click(viewSeriesButtons[0]);

      expect(screen.getByTestId('series-view-modal')).toBeInTheDocument();
      expect(screen.getByText('Series has 2 rides')).toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('should handle delete for single ride directly', () => {
      const rides = [createMockRide({ id: '1' })];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButton);

      expect(mockDeletePost).toHaveBeenCalledWith('1');
    });

    it('should show delete scope modal for series rides', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-22',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTestId('delete-scope-modal')).toBeInTheDocument();
      // Should NOT call deletePost directly for series rides
      expect(mockDeletePost).not.toHaveBeenCalled();
    });

    it('should show deleting state', () => {
      const rides = [createMockRide({ id: '1' })];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost="1" />);

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Deleting/i })).toBeDisabled();
    });

    it('should not disable delete button for other posts', () => {
      const rides = [
        createMockRide({
          id: '1',
          title: 'Ride Being Deleted',
          created_at: '2025-01-02T00:00:00Z',
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          title: 'Other Ride',
          created_at: '2025-01-01T00:00:00Z',
          departure_date: '2025-01-16',
        }),
      ];

      render(
        <MyPostsTab
          myRides={rides}
          deletePost={mockDeletePost}
          deletingPost="1" // Only deleting ride with id '1'
        />
      );

      // Should show one button in deleting state
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Deleting/i })).toBeDisabled();

      // Should show one button in normal state
      const normalDeleteButton = screen.getByRole('button', { name: /^Delete$/i });
      expect(normalDeleteButton).not.toBeDisabled();
      expect(normalDeleteButton).toHaveTextContent('Delete');
    });
  });

  describe('Edit Functionality', () => {
    it('should have edit buttons for all rides', () => {
      const rides = [
        createMockRide({ id: '1', departure_date: '2025-01-15' }),
        createMockRide({ id: '2', departure_date: '2025-01-16' }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      expect(editButtons).toHaveLength(2);
    });

    it('should navigate to edit page when edit button clicked on single ride', () => {
      const rides = [
        createMockRide({
          id: 'single-ride',
          departure_date: '2025-01-15',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const editButton = screen.getByRole('button', { name: /Edit/i });
      fireEvent.click(editButton);

      expect(mockRouterPush).toHaveBeenCalledWith('/rides/edit/single-ride');
    });

    it('should show edit scope modal for series rides', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-22',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId('edit-scope-modal')).toBeInTheDocument();
      // Should NOT navigate directly for series rides
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should navigate with mode param when edit scope selected', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-22',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      fireEvent.click(editButtons[0]);

      // Click "Edit Single" in the modal
      fireEvent.click(screen.getByText('Edit Single'));

      expect(mockRouterPush).toHaveBeenCalledWith('/rides/edit/1?mode=single');
    });
  });

  describe('Sorting', () => {
    it('should sort rides by departure_date', () => {
      const rides = [
        createMockRide({
          id: '1',
          title: 'Later Ride',
          departure_date: '2025-01-20',
          created_at: '2025-01-01T00:00:00Z',
        }),
        createMockRide({
          id: '2',
          title: 'Middle Ride',
          departure_date: '2025-01-15',
          created_at: '2025-01-10T00:00:00Z',
        }),
        createMockRide({
          id: '3',
          title: 'Earliest Ride',
          departure_date: '2025-01-10',
          created_at: '2025-01-15T00:00:00Z',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[0]).toHaveTextContent('Earliest Ride');
      expect(titles[1]).toHaveTextContent('Middle Ride');
      expect(titles[2]).toHaveTextContent('Later Ride');
    });
  });

  describe('Edge Cases', () => {
    it('should handle ride with no title', () => {
      const rides = [createMockRide({ title: '' })];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText('Untitled Ride')).toBeInTheDocument();
    });

    it('should handle orphaned grouped ride (single ride with group_id)', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'orphan',
          title: 'Orphaned Ride',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText('Orphaned Ride')).toBeInTheDocument();
      expect(screen.getByText('1 ride')).toBeInTheDocument();
    });

    it('should handle free rides (price_per_seat is 0 or null)', () => {
      const rides = [
        createMockRide({
          posting_type: 'driver',
          price_per_seat: 0,
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      expect(screen.getByText('Free')).toBeInTheDocument();
    });
  });

  describe('Delete Scope Modal Integration', () => {
    it('should close delete modal when cancel clicked', () => {
      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-22',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTestId('delete-scope-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel Delete'));

      expect(screen.queryByTestId('delete-scope-modal')).not.toBeInTheDocument();
    });

    it('should call API with correct scope when delete confirmed', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const rides = [
        createMockRide({
          id: '1',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-15',
        }),
        createMockRide({
          id: '2',
          round_trip_group_id: 'series1',
          is_recurring: true,
          departure_date: '2025-01-22',
        }),
      ];

      render(<MyPostsTab myRides={rides} deletePost={mockDeletePost} deletingPost={null} />);

      const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByText('Delete All'));

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/rides/1?apply_to=series', {
          method: 'DELETE',
        });
      });
    });
  });
});
