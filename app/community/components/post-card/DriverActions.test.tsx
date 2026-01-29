import { render, screen, fireEvent } from '@testing-library/react';
import { DriverActions } from './DriverActions';
import type { RidePostType, ProfileType } from '@/app/community/types';

// Mock PostActions component
jest.mock('@/app/community/components/post-card/PostActions', () => ({
  PostActions: ({
    onMessage,
    onDelete,
    onOpenBooking,
    isOwner,
    post,
    showBookingButton,
    deleting,
  }: {
    // eslint-disable-next-line no-unused-vars
    onMessage: (_user: ProfileType | null, _post: RidePostType) => void;
    // eslint-disable-next-line no-unused-vars
    onDelete?: (_id: string) => void;
    onOpenBooking: () => void;
    isOwner: boolean;
    post: RidePostType;
    showBookingButton: boolean;
    deleting?: boolean;
  }) => (
    <div data-testid="ride-post-actions">
      <button onClick={() => onMessage(post.owner, post)} data-testid="message-btn">
        Message
      </button>
      {showBookingButton && (
        <button onClick={onOpenBooking} data-testid="booking-btn">
          Book Ride
        </button>
      )}
      {isOwner && onDelete && (
        <button onClick={() => onDelete(post.id)} disabled={deleting} data-testid="delete-btn">
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      )}
    </div>
  ),
}));

describe('DriverActions', () => {
  const mockPost = {
    id: 'post-1',
    title: 'Ride to Tahoe',
    posting_type: 'driver',
    poster_id: 'user-1',
    owner: { id: 'user-1', first_name: 'John', last_name: 'Doe' },
    status: 'active',
  } as unknown as RidePostType;

  const mockOnMessage = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnOpenBooking = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Non-Owner Actions', () => {
    it('should render message button', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={false}
          showBookingButton={false}
          onMessage={mockOnMessage}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      expect(screen.getByTestId('message-btn')).toBeInTheDocument();
    });

    it('should call onMessage with correct parameters', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={false}
          showBookingButton={false}
          onMessage={mockOnMessage}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      fireEvent.click(screen.getByTestId('message-btn'));
      expect(mockOnMessage).toHaveBeenCalledWith(mockPost.owner, mockPost);
    });

    it('should show booking button when showBookingButton is true', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={false}
          showBookingButton={true}
          onMessage={mockOnMessage}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      expect(screen.getByTestId('booking-btn')).toBeInTheDocument();
    });

    it('should not show booking button when false', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={false}
          showBookingButton={false}
          onMessage={mockOnMessage}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      expect(screen.queryByTestId('booking-btn')).not.toBeInTheDocument();
    });

    it('should call onOpenBooking when booking button clicked', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={false}
          showBookingButton={true}
          onMessage={mockOnMessage}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      fireEvent.click(screen.getByTestId('booking-btn'));
      expect(mockOnOpenBooking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Owner Actions', () => {
    it('should show delete button for owners when onDelete provided', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={true}
          showBookingButton={false}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
    });

    it('should call onDelete with post id', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={true}
          showBookingButton={false}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      fireEvent.click(screen.getByTestId('delete-btn'));
      expect(mockOnDelete).toHaveBeenCalledWith('post-1');
    });

    it('should not show booking button for owners', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={true}
          showBookingButton={false}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      expect(screen.queryByTestId('booking-btn')).not.toBeInTheDocument();
    });
  });

  describe('Deleting State', () => {
    it('should show Deleting text when deleting is true', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={true}
          showBookingButton={false}
          deleting={true}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should disable delete button when deleting', () => {
      render(
        <DriverActions
          post={mockPost}
          isOwner={true}
          showBookingButton={false}
          deleting={true}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onOpenBooking={mockOnOpenBooking}
        />
      );
      expect(screen.getByTestId('delete-btn')).toBeDisabled();
    });
  });
});
