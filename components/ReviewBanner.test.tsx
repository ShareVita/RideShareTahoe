import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewBanner from './ReviewBanner';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock fetch
globalThis.fetch = jest.fn();

describe('ReviewBanner', () => {
  const mockOnReviewClick = jest.fn();
  const mockGetUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    });
  });

  it('does not render if user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(<ReviewBanner onReviewClick={mockOnReviewClick} />);

    await waitFor(() => {
      expect(screen.queryByText(/pending review/i)).not.toBeInTheDocument();
    });
  });

  it('does not render if no pending reviews', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ pendingReviews: [] }),
    });

    render(<ReviewBanner onReviewClick={mockOnReviewClick} />);

    await waitFor(() => {
      expect(screen.queryByText(/pending review/i)).not.toBeInTheDocument();
    });
  });

  it('renders correctly with one pending review', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const mockReview = {
      meeting_id: 'meeting-1',
      meeting_title: 'Meeting 1',
      other_participant_name: 'John Doe',
    };
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ pendingReviews: [mockReview] }),
    });

    render(<ReviewBanner onReviewClick={mockOnReviewClick} />);

    await waitFor(() => {
      expect(screen.getByText('You have a pending review')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Leave Review')).toBeInTheDocument();
    });
  });

  it('renders correctly with multiple pending reviews', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const mockReviews = [
      {
        meeting_id: 'meeting-1',
        meeting_title: 'Meeting 1',
        other_participant_name: 'John Doe',
      },
      {
        meeting_id: 'meeting-2',
        meeting_title: 'Meeting 2',
        other_participant_name: 'Jane Doe',
      },
    ];
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ pendingReviews: mockReviews }),
    });

    render(<ReviewBanner onReviewClick={mockOnReviewClick} />);

    await waitFor(() => {
      expect(screen.getByText('You have 2 pending reviews')).toBeInTheDocument();
      expect(screen.getByText('Review Now')).toBeInTheDocument();
    });
  });

  it('calls onReviewClick when button is clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const mockReview = {
      meeting_id: 'meeting-1',
      meeting_title: 'Meeting 1',
      other_participant_name: 'John Doe',
    };
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ pendingReviews: [mockReview] }),
    });

    render(<ReviewBanner onReviewClick={mockOnReviewClick} />);

    await waitFor(() => {
      expect(screen.getByText('Leave Review')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Leave Review'));
    expect(mockOnReviewClick).toHaveBeenCalledWith(mockReview);
  });

  it('dismisses banner when close button is clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const mockReview = {
      meeting_id: 'meeting-1',
      meeting_title: 'Meeting 1',
      other_participant_name: 'John Doe',
    };
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ pendingReviews: [mockReview] }),
    });

    render(<ReviewBanner onReviewClick={mockOnReviewClick} />);

    await waitFor(() => {
      expect(screen.getByText('You have a pending review')).toBeInTheDocument();
    });

    // Find the close button (SVG inside a button)
    // It doesn't have a name, but it's the second button
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // The second button is the dismiss button

    expect(screen.queryByText('You have a pending review')).not.toBeInTheDocument();
  });
});
