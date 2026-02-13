import { useRouter } from 'next/navigation';
import { render, screen, fireEvent } from '@testing-library/react';
import { RidePostCard } from './RidePostCard';
import { useUserProfile } from '@/hooks/useProfile';
import type { RidePostType, ProfileType } from '../../types';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('@/components/trips/TripBookingModal', () => ({
  __esModule: true,
  default: () => <div data-testid="booking-modal">Booking Modal</div>,
}));

jest.mock('./RidePostActions', () => ({
  RidePostActions: ({
    onMessage,
    onDelete,
    isOwner,
    post,
  }: {
    // eslint-disable-next-line no-unused-vars
    onMessage: (_user: ProfileType | null, _post: RidePostType) => void;
    // eslint-disable-next-line no-unused-vars
    onDelete: (_id: string) => void;
    isOwner: boolean;
    post: RidePostType;
  }) => (
    <div data-testid="post-actions">
      <button onClick={() => onMessage(post.owner, post)} data-testid="msg-btn">
        Msg
      </button>
      {isOwner && (
        <button onClick={() => onDelete(post.id)} data-testid="del-btn">
          Del
        </button>
      )}
    </div>
  ),
}));

describe('RidePostCard', () => {
  const mockPost = {
    id: 'post-1',
    title: 'Test Ride',
    start_location: 'SF',
    end_location: 'Tahoe',
    posting_type: 'driver',
    status: 'active',
    poster_id: 'user-2', // Not owner
    owner: { id: 'user-2', first_name: 'John', last_name: 'Doe' },
    departure_date: '2025-01-01',
    departure_time: '12:00:00',
    available_seats: 3,
    price_per_seat: 50,
  } as unknown as RidePostType;

  const mockOnMessage = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useUserProfile as jest.Mock).mockReturnValue({
      data: { first_name: 'Test User' },
      isLoading: false,
    });
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  it('should render post details', () => {
    render(
      <RidePostCard
        post={mockPost}
        currentUserId="user-1" // Not owner
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
        onViewDetails={() => {}}
      />
    );

    expect(screen.getByText('Test Ride')).toBeInTheDocument();
    expect(screen.getByText('SF')).toBeInTheDocument();
    expect(screen.getByText('Tahoe')).toBeInTheDocument();
    expect(screen.getByText(/\$50/)).toBeInTheDocument();
    expect(screen.getByText(/3 seats left/)).toBeInTheDocument();
  });

  it('should render owner info if visible', () => {
    render(
      <RidePostCard
        post={mockPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
        onViewDetails={() => {}}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should not render owner info section when current user is the owner', () => {
    const ownerPost = { ...mockPost, poster_id: 'user-1' };
    render(
      <RidePostCard
        post={ownerPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
        onViewDetails={() => {}}
      />
    );

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('should handle message click', () => {
    render(
      <RidePostCard
        post={mockPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
        onViewDetails={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('msg-btn'));
    expect(mockOnMessage).toHaveBeenCalledWith(mockPost.owner, mockPost);
  });

  it('should handle delete click (owner)', () => {
    const ownerPost = { ...mockPost, poster_id: 'user-1' };
    render(
      <RidePostCard
        post={ownerPost}
        currentUserId="user-1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
        onViewDetails={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('del-btn'));
    expect(mockOnDelete).toHaveBeenCalledWith('post-1');
  });

  it('calls onViewDetails when clicking View Details', () => {
    const onViewDetails = jest.fn();

    render(
      <RidePostCard
        post={mockPost}
        currentUserId="u1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
        onViewDetails={onViewDetails}
      />
    );

    fireEvent.click(screen.getByText(/View Details/i));
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });
});
