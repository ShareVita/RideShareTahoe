import { useRouter } from 'next/navigation';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostCard } from './PostCard.refactored';
import { useUserProfile } from '@/hooks/useProfile';
import { useIsBlocked } from '@/hooks/useIsBlocked';
import { useProfileCompletionPrompt } from '@/hooks/useProfileCompletionPrompt';
import type { RidePostType } from '@/app/community/types';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useIsBlocked', () => ({
  useIsBlocked: jest.fn(),
}));

jest.mock('@/hooks/useProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('@/hooks/useProfileCompletionPrompt', () => ({
  useProfileCompletionPrompt: jest.fn(),
}));

// Mock subcomponents
jest.mock('./PostCardHeader', () => ({
  PostCardHeader: ({ post }: { post: RidePostType }) => (
    <div data-testid="post-card-header">{post.title}</div>
  ),
}));

jest.mock('./RouteInfo', () => ({
  RouteInfo: ({ startLocation, endLocation }: { startLocation: string; endLocation: string }) => (
    <div data-testid="route-info">
      {startLocation} to {endLocation}
    </div>
  ),
}));

jest.mock('./OwnerInfo', () => ({
  OwnerInfo: () => <div data-testid="owner-info">Owner Info</div>,
}));

jest.mock('./DriverActions', () => ({
  DriverActions: ({
    onOpenBooking,
    showBookingButton,
  }: {
    onOpenBooking: () => void;
    showBookingButton: boolean;
  }) => (
    <div data-testid="driver-actions">
      {showBookingButton && (
        <button onClick={onOpenBooking} data-testid="book-btn" type="button">
          Book
        </button>
      )}
    </div>
  ),
}));

jest.mock('./PassengerActions', () => ({
  PassengerActions: ({ onInvite, onMessage }: { onInvite: () => void; onMessage: () => void }) => (
    <div data-testid="passenger-actions">
      <button onClick={onMessage} data-testid="message-btn" type="button">
        Message
      </button>
      <button onClick={onInvite} data-testid="invite-btn" type="button">
        Invite
      </button>
    </div>
  ),
}));

jest.mock('@/components/trips/TripBookingModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="booking-modal">
        <button onClick={onClose} data-testid="close-booking-modal">
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/trips/InviteToRideModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="invite-modal">
        <button onClick={onClose} data-testid="close-invite-modal">
          Close
        </button>
      </div>
    ) : null,
}));

describe('PostCard Integration', () => {
  const mockDriverPost = {
    id: 'post-1',
    title: 'Ride to Tahoe',
    start_location: 'SF',
    end_location: 'Tahoe',
    posting_type: 'driver',
    status: 'active',
    poster_id: 'user-2',
    owner: { id: 'user-2', first_name: 'John', last_name: 'Doe' },
    available_seats: 3,
  } as unknown as RidePostType;

  const mockPassengerPost = {
    id: 'post-2',
    title: 'Need Ride',
    start_location: 'SF',
    end_location: 'Tahoe',
    posting_type: 'passenger',
    status: 'active',
    poster_id: 'user-3',
    owner: { id: 'user-3', first_name: 'Bob', last_name: 'Smith' },
  } as unknown as RidePostType;

  const mockOnMessage = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useIsBlocked as jest.Mock).mockReturnValue({ isBlocked: false, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({
      data: { first_name: 'Test User' },
      isLoading: false,
    });
    (useProfileCompletionPrompt as jest.Mock).mockReturnValue({
      showProfileCompletionPrompt: jest.fn(),
      profileCompletionModal: null,
    });
  });

  describe('Blocked User Behavior', () => {
    it('should hide driver post when viewer is blocked (not owner)', () => {
      (useIsBlocked as jest.Mock).mockReturnValue({ isBlocked: true, loading: false });

      const { container } = render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should hide passenger post when viewer is blocked (not owner)', () => {
      (useIsBlocked as jest.Mock).mockReturnValue({ isBlocked: true, loading: false });

      const { container } = render(
        <PostCard
          post={mockPassengerPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show driver post to owner even when blocked', () => {
      (useIsBlocked as jest.Mock).mockReturnValue({ isBlocked: true, loading: false });

      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-2"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText('Ride to Tahoe')).toBeInTheDocument();
    });

    it('should show passenger post to owner even when blocked', () => {
      (useIsBlocked as jest.Mock).mockReturnValue({ isBlocked: true, loading: false });

      render(
        <PostCard
          post={mockPassengerPost}
          currentUserId="user-3"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText('Need Ride')).toBeInTheDocument();
    });

    it('should render while isBlocked is loading', () => {
      (useIsBlocked as jest.Mock).mockReturnValue({ isBlocked: false, loading: true });

      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText('Ride to Tahoe')).toBeInTheDocument();
    });
  });

  describe('Profile Completion Behavior', () => {
    it('should show prompt when incomplete user tries to book driver post', () => {
      const mockShowPrompt = jest.fn();
      (useUserProfile as jest.Mock).mockReturnValue({
        data: { first_name: null },
        isLoading: false,
      });
      (useProfileCompletionPrompt as jest.Mock).mockReturnValue({
        showProfileCompletionPrompt: mockShowPrompt,
        profileCompletionModal: null,
      });

      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      fireEvent.click(screen.getByTestId('book-btn'));
      expect(mockShowPrompt).toHaveBeenCalled();
    });

    it('should show prompt when incomplete user tries to message driver post', () => {
      const mockShowPrompt = jest.fn();
      (useUserProfile as jest.Mock).mockReturnValue({ data: { first_name: '' }, isLoading: false });
      (useProfileCompletionPrompt as jest.Mock).mockReturnValue({
        showProfileCompletionPrompt: mockShowPrompt,
        profileCompletionModal: null,
      });

      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      fireEvent.click(screen.getByTestId('book-btn'));
      expect(mockShowPrompt).toHaveBeenCalled();
    });

    it('should show prompt when incomplete user tries to message passenger post', () => {
      const mockShowPrompt = jest.fn();
      (useUserProfile as jest.Mock).mockReturnValue({ data: { first_name: '' }, isLoading: false });
      (useProfileCompletionPrompt as jest.Mock).mockReturnValue({
        showProfileCompletionPrompt: mockShowPrompt,
        profileCompletionModal: null,
      });

      render(
        <PostCard
          post={mockPassengerPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      fireEvent.click(screen.getByTestId('message-btn'));
      expect(mockShowPrompt).toHaveBeenCalled();
    });

    it('should show prompt when incomplete user tries to invite to passenger post', () => {
      const mockShowPrompt = jest.fn();
      (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
      (useProfileCompletionPrompt as jest.Mock).mockReturnValue({
        showProfileCompletionPrompt: mockShowPrompt,
        profileCompletionModal: null,
      });

      render(
        <PostCard
          post={mockPassengerPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      fireEvent.click(screen.getByTestId('invite-btn'));
      expect(mockShowPrompt).toHaveBeenCalled();
    });

    it('should allow actions when profile is complete', () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        data: { first_name: 'John' },
        isLoading: false,
      });

      render(
        <PostCard
          post={mockPassengerPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      fireEvent.click(screen.getByTestId('message-btn'));
      expect(mockOnMessage).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle driver post without owner', () => {
      const postWithoutOwner = { ...mockDriverPost, owner: null };

      render(
        <PostCard
          post={postWithoutOwner as unknown as RidePostType}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByTestId('post-card-header')).toBeInTheDocument();
      expect(screen.queryByTestId('owner-info')).not.toBeInTheDocument();
    });

    it('should handle passenger post without owner', () => {
      const postWithoutOwner = { ...mockPassengerPost, owner: null };

      render(
        <PostCard
          post={postWithoutOwner as unknown as RidePostType}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByTestId('post-card-header')).toBeInTheDocument();
      expect(screen.queryByTestId('owner-info')).not.toBeInTheDocument();
    });

    it('should handle driver post with missing available_seats', () => {
      const postWithoutSeats = { ...mockDriverPost, available_seats: undefined };

      render(
        <PostCard
          post={postWithoutSeats as unknown as RidePostType}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.queryByTestId('book-btn')).not.toBeInTheDocument();
    });

    it('should handle driver post with missing total_seats', () => {
      const postWithoutSeats = {
        ...mockDriverPost,
        available_seats: undefined,
        total_seats: undefined,
      };

      render(
        <PostCard
          post={postWithoutSeats as unknown as RidePostType}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.queryByTestId('book-btn')).not.toBeInTheDocument();
    });

    it('should handle driver post with 0 available seats', () => {
      const postWithZeroSeats = { ...mockDriverPost, available_seats: 0 };

      render(
        <PostCard
          post={postWithZeroSeats}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.queryByTestId('book-btn')).not.toBeInTheDocument();
    });

    it('should handle return-only round trip (missing departure info)', () => {
      const returnOnlyPost = {
        ...mockDriverPost,
        is_round_trip: true,
        departure_date: '',
        departure_time: '',
        return_date: '2025-01-05',
        return_time: '18:00:00',
      } as unknown as RidePostType;

      render(
        <PostCard
          post={returnOnlyPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByTestId('post-card-header')).toBeInTheDocument();
    });

    it('should handle undefined currentUserId', () => {
      render(
        <PostCard
          post={mockDriverPost}
          currentUserId={undefined}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByTestId('post-card-header')).toBeInTheDocument();
    });
  });

  describe('Modal Open/Close Flows', () => {
    it('should open and close TripBookingModal for driver posts', () => {
      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Modal should not be visible initially
      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();

      // Open modal
      fireEvent.click(screen.getByTestId('book-btn'));
      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId('close-booking-modal'));
      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });

    it('should open and close InviteToRideModal for passenger posts', () => {
      render(
        <PostCard
          post={mockPassengerPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Modal should not be visible initially
      expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();

      // Open modal
      fireEvent.click(screen.getByTestId('invite-btn'));
      expect(screen.getByTestId('invite-modal')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId('close-invite-modal'));
      expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
    });

    it('should not render TripBookingModal for passenger posts', () => {
      render(
        <PostCard
          post={mockPassengerPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      fireEvent.click(screen.getByTestId('invite-btn'));
      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });

    it('should not render InviteToRideModal for driver posts', () => {
      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      fireEvent.click(screen.getByTestId('book-btn'));
      expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
    });

    it('should not render InviteToRideModal without currentUserId', () => {
      render(
        <PostCard
          post={mockPassengerPost}
          currentUserId={undefined}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
    });

    it('should handle multiple modal open/close cycles for TripBookingModal', () => {
      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      // First cycle
      fireEvent.click(screen.getByTestId('book-btn'));
      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('close-booking-modal'));
      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();

      // Second cycle
      fireEvent.click(screen.getByTestId('book-btn'));
      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('close-booking-modal'));
      expect(screen.queryByTestId('booking-modal')).not.toBeInTheDocument();
    });
  });

  describe('Component Composition', () => {
    it('should render all subcomponents for driver post', () => {
      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByTestId('post-card-header')).toBeInTheDocument();
      expect(screen.getByTestId('route-info')).toBeInTheDocument();
      expect(screen.getByTestId('owner-info')).toBeInTheDocument();
      expect(screen.getByTestId('driver-actions')).toBeInTheDocument();
    });

    it('should render all subcomponents for passenger post', () => {
      render(
        <PostCard
          post={mockPassengerPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByTestId('post-card-header')).toBeInTheDocument();
      expect(screen.getByTestId('route-info')).toBeInTheDocument();
      expect(screen.getByTestId('passenger-actions')).toBeInTheDocument();
    });

    it('should not render owner info for post owner', () => {
      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-2"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.queryByTestId('owner-info')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render as article with proper ARIA label', () => {
      const { container } = render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveAttribute('role', 'article');
      expect(article).toHaveAttribute('aria-label');
    });

    it('should have accessible View Details button', () => {
      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      const viewDetailsButton = screen.getByText(/View Details/);
      expect(viewDetailsButton).toHaveAttribute('type', 'button');
      expect(viewDetailsButton).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', () => {
      render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should have proper semantic HTML structure', () => {
      const { container } = render(
        <PostCard
          post={mockDriverPost}
          currentUserId="user-1"
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(container.querySelector('article')).toBeInTheDocument();
    });
  });
});
