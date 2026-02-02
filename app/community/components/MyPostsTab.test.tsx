import { render, screen, fireEvent } from '@testing-library/react';
import { MyPostsTab } from './MyPostsTab';
import type { RidePostType } from '../types';

// Mock PostCard instead of RidePostCard
jest.mock('@/app/community/components/post-card/PostCard.refactored', () => ({
  PostCard: ({
    post,
    onDelete,
    deleting,
    onViewDetails,
  }: {
    post: RidePostType;
    // eslint-disable-next-line no-unused-vars
    onDelete: (_id: string) => void;
    deleting: boolean;
    onViewDetails: () => void;
  }) => (
    <div data-testid="post-card">
      <span data-testid={`post-${post.id}`}>{post.id}</span>
      <button onClick={() => onDelete(post.id)} data-testid={`delete-${post.id}`}>
        Delete
      </button>
      <button onClick={onViewDetails} data-testid={`view-details-${post.id}`}>
        View Details
      </button>
      {deleting && <span data-testid={`deleting-${post.id}`}>Deleting...</span>}
    </div>
  ),
}));

// Mock PostDetailModal
jest.mock('@/app/community/components/PostDetailModal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    post,
  }: {
    isOpen: boolean;
    onClose: () => void;
    post: RidePostType;
  }) =>
    isOpen ? (
      <div data-testid="post-detail-modal">
        <span>Post Detail: {post.id}</span>
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
      </div>
    ) : null,
}));

describe('MyPostsTab', () => {
  const mockUser = { id: 'user-1' };
  const mockOpenMessageModal = jest.fn();
  const mockDeletePost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no rides', () => {
    render(
      <MyPostsTab
        myRides={[]}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    expect(screen.getByText(/You haven't posted any rides yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create New Post/i })).toHaveAttribute(
      'href',
      '/rides/post'
    );
  });

  it('should render list of rides and summary', () => {
    const rides = [
      { id: '1', created_at: '2023-01-01' },
      { id: '2', created_at: '2023-01-02' },
    ] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    expect(screen.getByText('2 posts')).toBeInTheDocument();
    expect(screen.getAllByTestId('post-card')).toHaveLength(2);
  });

  it('should group round trips', () => {
    const rides = [
      {
        id: '1',
        created_at: '2023-01-01',
        round_trip_group_id: 'g1',
        trip_direction: 'departure',
        departure_date: '2023-01-01',
      },
      {
        id: '2',
        created_at: '2023-01-01',
        round_trip_group_id: 'g1',
        trip_direction: 'return',
        departure_date: '2023-01-05',
        departure_time: '18:00:00',
      },
      { id: '3', created_at: '2023-01-02' },
    ] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    // Should be 2 cards: one merged group + ride 3
    expect(screen.getByText('2 posts')).toBeInTheDocument();
    expect(screen.getAllByTestId('post-card')).toHaveLength(2);
  });

  it('should handle delete interaction', () => {
    const rides = [{ id: '1', created_at: '2023-01-01' }] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    fireEvent.click(screen.getByTestId('delete-1'));
    expect(mockDeletePost).toHaveBeenCalledWith('1');
  });

  it('should show deleting state', () => {
    const rides = [{ id: '1', created_at: '2023-01-01' }] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost="1"
      />
    );

    expect(screen.getByTestId('deleting-1')).toBeInTheDocument();
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('should open post detail modal when view details clicked', async () => {
    const rides = [{ id: '1', created_at: '2023-01-01' }] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    // Modal should not be visible initially
    expect(screen.queryByTestId('post-detail-modal')).not.toBeInTheDocument();

    // Click view details
    fireEvent.click(screen.getByTestId('view-details-1'));

    // Wait for modal to appear (the component uses setTimeout)
    await screen.findByTestId('post-detail-modal');
    expect(screen.getByText('Post Detail: 1')).toBeInTheDocument();
  });

  it('should close post detail modal', async () => {
    const rides = [{ id: '1', created_at: '2023-01-01' }] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    // Open modal
    fireEvent.click(screen.getByTestId('view-details-1'));
    await screen.findByTestId('post-detail-modal');
    expect(screen.getByTestId('post-detail-modal')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('close-modal'));
    expect(screen.queryByTestId('post-detail-modal')).not.toBeInTheDocument();
  });

  it('should sort rides by created_at (most recent first)', () => {
    const rides = [
      { id: 'ride-1', created_at: '2023-01-01T10:00:00Z' },
      { id: 'ride-2', created_at: '2023-01-03T10:00:00Z' }, // Most recent
      { id: 'ride-3', created_at: '2023-01-02T10:00:00Z' },
    ] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    const postCards = screen.getAllByTestId('post-card');
    expect(postCards).toHaveLength(3);

    // Check the order by looking at the text content of each card
    const firstCard = postCards[0];
    const secondCard = postCards[1];
    const thirdCard = postCards[2];

    // Should be sorted by created_at DESC: ride-2 (Jan 3), ride-3 (Jan 2), ride-1 (Jan 1)
    expect(firstCard).toHaveTextContent('ride-2');
    expect(secondCard).toHaveTextContent('ride-3');
    expect(thirdCard).toHaveTextContent('ride-1');
  });

  it('should display singular "post" when only one post', () => {
    const rides = [{ id: '1', created_at: '2023-01-01' }] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    expect(screen.getByText('1 post')).toBeInTheDocument();
  });

  it('should handle round trip with only departure leg', () => {
    const rides = [
      {
        id: '1',
        created_at: '2023-01-01',
        round_trip_group_id: 'g1',
        trip_direction: 'departure',
      },
    ] as unknown as RidePostType[];

    render(
      <MyPostsTab
        myRides={rides}
        user={mockUser}
        openMessageModal={mockOpenMessageModal}
        deletePost={mockDeletePost}
        deletingPost={null}
      />
    );

    // Should show as single post
    expect(screen.getByText('1 post')).toBeInTheDocument();
    expect(screen.getAllByTestId('post-card')).toHaveLength(1);
  });
});
