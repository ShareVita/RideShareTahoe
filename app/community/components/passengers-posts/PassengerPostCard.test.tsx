import { render, screen, fireEvent } from '@testing-library/react';
import { PassengerPostCard } from './PassengerPostCard';
import type { RidePostType } from '../../types';

// Mocks
jest.mock('@/hooks/useIsBlocked', () => ({
  useIsBlocked: () => ({ isBlocked: false, loading: false }),
}));

jest.mock('@/components/trips/InviteToRideModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="invite-modal">
        <span data-testid="invite-modal-text">Invite Modal</span>
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
      </div>
    ) : null,
}));

describe('PassengerPostCard', () => {
  const mockPost = {
    id: 'p1',
    title: 'Need Ride to Tahoe',
    start_location: 'SF',
    end_location: 'Tahoe',
    posting_type: 'passenger',
    status: 'active',
    poster_id: 'u2',
    owner: { id: 'u2', first_name: 'Bob', last_name: 'Smith' },
    departure_date: '2025-01-01',
  } as unknown as RidePostType;

  const mockOnMessage = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders post details', () => {
    render(
      <PassengerPostCard
        post={mockPost}
        currentUserId="u1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Need Ride to Tahoe')).toBeInTheDocument();
    expect(screen.getByText('SF')).toBeInTheDocument();
    expect(screen.getByText('Tahoe')).toBeInTheDocument();
    expect(screen.getByText('👋 Passenger')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('renders owner actions', () => {
    const ownerPost = {
      ...mockPost,
      poster_id: 'u1',
      owner: { id: 'u1' },
    } as unknown as RidePostType;
    render(
      <PassengerPostCard
        post={ownerPost}
        currentUserId="u1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('handles delete (owner)', () => {
    const ownerPost = {
      ...mockPost,
      poster_id: 'u1',
      owner: { id: 'u1' },
    } as unknown as RidePostType;
    render(
      <PassengerPostCard
        post={ownerPost}
        currentUserId="u1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnDelete).toHaveBeenCalledWith('p1');
  });

  it('renders viewer actions (no booking)', () => {
    render(
      <PassengerPostCard
        post={mockPost}
        currentUserId="u1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Invite')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument(); // Message always available
    expect(screen.getByText('View Profile')).toBeInTheDocument();
  });

  it('message button is always visible for non-owner', () => {
    render(
      <PassengerPostCard
        post={mockPost}
        currentUserId="u1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    // Message button should be visible (messaging now unrestricted)
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('opens invite modal', () => {
    render(
      <PassengerPostCard
        post={mockPost}
        currentUserId="u1"
        onMessage={mockOnMessage}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText('Invite'));
    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-modal'));
    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument();
  });
});
