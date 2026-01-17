import { render, screen, fireEvent } from '@testing-library/react';
import PostDetailModal from './PostDetailModal';
import { useHasActiveBooking } from '@/hooks/useHasActiveBooking';
import { useUserProfile } from '@/hooks/useProfile';
import type { RidePostType } from '@/app/community/types';

// Mocks
jest.mock('@/hooks/useHasActiveBooking', () => ({
  useHasActiveBooking: jest.fn(),
}));

jest.mock('@/hooks/useProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('@/hooks/useProfileCompletionPrompt', () => ({
  useProfileCompletionPrompt: jest.fn(() => ({
    showProfileCompletionPrompt: jest.fn(),
    profileCompletionModal: null,
  })),
}));

jest.mock('@/components/trips/InviteToRideModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="invite-modal">
        <span data-testid="invite-modal-text">Invite Modal</span>
        <button onClick={onClose} data-testid="close-invite">
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/trips/TripBookingModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="booking-modal">
        <span data-testid="booking-modal-text">Booking Modal</span>
        <button onClick={onClose} data-testid="close-booking">
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock('@/app/community/components/rides-posts/RidePostActions', () => ({
  RidePostActions: ({
    onDelete,
    isOwner,
    post,
    onOpenBooking,
  }: {
    // eslint-disable-next-line no-unused-vars
    onDelete?: (postId: string) => void;
    isOwner: boolean;
    post: RidePostType;
    onOpenBooking: () => void;
  }) => (
    <div data-testid="post-actions">
      <button onClick={onOpenBooking} data-testid="open-booking">
        Open Booking
      </button>
      {isOwner && onDelete && (
        <button onClick={() => onDelete(post.id)} data-testid="del-btn">
          Del
        </button>
      )}
    </div>
  ),
}));

// Keep these simple so tests aren’t brittle on date formatting
jest.mock('@/lib/dateFormat', () => ({
  formatDateLabel: (v?: string | null) => (v ? 'Jan 1, 2025' : null),
  formatTimeLabel: (v?: string | null) => (v ? '12:00 PM' : null),
}));

jest.mock('@/app/community/components/utils/postBadges', () => ({
  getBadgeConfig: (type: string) => {
    if (type === 'driver') return { styles: 'bg-blue', label: '🚗 Driver' };
    return { styles: 'bg-green', label: '👋 Passenger' };
  },
}));

jest.mock('@/app/community/components/utils/tripDirection', () => ({
  getDirectionConfig: () => ({
    label: '',
    styles: '',
    isCombinedRoundTrip: false,
  }),
}));

describe('PostDetailModal', () => {
  const mockPost = {
    id: 'post-1',
    title: 'Test Ride',
    start_location: 'SF',
    end_location: 'Tahoe',
    posting_type: 'passenger',
    status: 'active',
    poster_id: 'user-2',
    owner: { id: 'user-2', first_name: 'John', last_name: 'Doe' },
    departure_date: '2025-01-01',
    departure_time: '12:00:00',
  } as unknown as RidePostType;

  const mockOnClose = jest.fn();
  const mockOnMessage = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useHasActiveBooking as jest.Mock).mockReturnValue({ hasBooking: false });
    (useUserProfile as jest.Mock).mockReturnValue({
      data: { first_name: 'Test User' },
      isLoading: false,
    });
  });

  it('renders post details when open', () => {
    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={mockPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Ride')).toBeInTheDocument();
    expect(screen.getByText('SF')).toBeInTheDocument();
    expect(screen.getByText('Tahoe')).toBeInTheDocument();
    expect(screen.getByText('👋 Passenger')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(
      <PostDetailModal
        isOpen={false}
        onClose={mockOnClose}
        post={mockPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByText('Test Ride')).not.toBeInTheDocument();
  });

  it('calls onClose when clicking the close button', () => {
    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={mockPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByLabelText(/close post details/i));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders owner actions when current user is owner', () => {
    const ownerPost = {
      ...mockPost,
      poster_id: 'user-1',
      owner: { id: 'user-1' },
    } as unknown as RidePostType;

    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={ownerPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('post-actions')).toBeInTheDocument();
    expect(screen.getByTestId('del-btn')).toBeInTheDocument();
  });

  it('handles delete click (owner)', () => {
    const ownerPost = {
      ...mockPost,
      poster_id: 'user-1',
      owner: { id: 'user-1' },
    } as unknown as RidePostType;

    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={ownerPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByTestId('del-btn'));
    expect(mockOnDelete).toHaveBeenCalledWith('post-1');
  });

  it('opens invite modal', () => {
    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={mockPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText('Invite'));
    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-invite'));
    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
  });

  it('renders Message for passenger post when hasBooking', () => {
    (useHasActiveBooking as jest.Mock).mockReturnValue({ hasBooking: true });

    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={mockPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('opens booking modal from actions (driver post)', () => {
    const driverPost = {
      ...mockPost,
      posting_type: 'driver',
      poster_id: 'user-2',
      available_seats: 2,
      price_per_seat: 50,
    } as unknown as RidePostType;

    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={driverPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByTestId('open-booking'));
    expect(screen.getByTestId('booking-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-booking'));
    expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
  });

  it('displays driver-specific metadata', () => {
    const driverPost = {
      ...mockPost,
      posting_type: 'driver',
      car_type: 'Tesla Model 3',
      driving_arrangement: 'Pick up at location',
      music_preference: 'Jazz',
    } as unknown as RidePostType;

    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={driverPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/Vehicle:/)).toBeInTheDocument();
    expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
    expect(screen.getByText(/Pickup:/)).toBeInTheDocument();
  });

  it('displays status badge for owner', () => {
    const ownerPost = {
      ...mockPost,
      poster_id: 'user-1',
      owner: { id: 'user-1' },
      status: 'active',
    } as unknown as RidePostType;

    render(
      <PostDetailModal
        isOpen
        onClose={mockOnClose}
        post={ownerPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('active')).toBeInTheDocument();
  });
});
