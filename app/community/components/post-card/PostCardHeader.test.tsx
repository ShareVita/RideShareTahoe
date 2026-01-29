import { render, screen } from '@testing-library/react';
import { PostCardHeader } from './PostCardHeader';
import type { RidePostType } from '@/app/community/types';

// Mock utility functions
jest.mock('@/lib/dateFormat', () => ({
  formatDateLabel: jest.fn((date: string) => (date ? `Formatted ${date}` : null)),
  formatTimeLabel: jest.fn((time: string) => (time ? `Formatted ${time}` : null)),
}));

jest.mock('@/app/community/components/utils/postBadges', () => ({
  getBadgeConfig: jest.fn((type: string) => ({
    styles: type === 'driver' ? 'driver-badge' : 'passenger-badge',
    label: type === 'driver' ? '🚗 Driver' : '👋 Passenger',
  })),
}));

jest.mock('@/app/community/components/utils/tripDirection', () => ({
  getDirectionConfig: jest.fn((post: RidePostType) => ({
    label: post.is_round_trip ? '↔️ Round Trip' : null,
    styles: 'direction-badge',
    isCombinedRoundTrip: post.is_round_trip,
  })),
}));

describe('PostCardHeader', () => {
  const baseDriverPost = {
    id: 'post-1',
    title: 'Ride to Tahoe',
    posting_type: 'driver',
    status: 'active',
    poster_id: 'user-1',
    departure_date: '2025-01-01',
    departure_time: '12:00:00',
    available_seats: 3,
    total_seats: 4,
    price_per_seat: 50,
  } as unknown as RidePostType;

  const basePassengerPost = {
    id: 'post-2',
    title: 'Need Ride',
    posting_type: 'passenger',
    status: 'active',
    poster_id: 'user-2',
    departure_date: '2025-01-01',
    departure_time: '10:00:00',
  } as unknown as RidePostType;

  describe('Driver Posts', () => {
    it('should render driver post with title and badge', () => {
      render(<PostCardHeader post={baseDriverPost} isDriverPost={true} isOwner={false} />);
      expect(screen.getByText('Ride to Tahoe')).toBeInTheDocument();
      expect(screen.getByText('🚗 Driver')).toBeInTheDocument();
    });

    it('should render fallback title for untitled driver post', () => {
      const postWithoutTitle = { ...baseDriverPost, title: '' };
      render(<PostCardHeader post={postWithoutTitle} isDriverPost={true} isOwner={false} />);
      expect(screen.getByText('Untitled Ride')).toBeInTheDocument();
    });

    it('should display price and seats for paid rides', () => {
      render(<PostCardHeader post={baseDriverPost} isDriverPost={true} isOwner={false} />);
      expect(screen.getByText('$50/seat')).toBeInTheDocument();
      expect(screen.getByText(/3 seats left/)).toBeInTheDocument();
      expect(screen.getByText(/cost share/)).toBeInTheDocument();
    });

    it('should display "Free" for rides without price', () => {
      const freePost = { ...baseDriverPost, price_per_seat: 0 };
      render(<PostCardHeader post={freePost} isDriverPost={true} isOwner={false} />);
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.queryByText(/cost share/)).not.toBeInTheDocument();
    });

    it('should display "No seats available" when seats are 0', () => {
      const postWithZeroSeats = { ...baseDriverPost, available_seats: 0 };
      render(<PostCardHeader post={postWithZeroSeats} isDriverPost={true} isOwner={false} />);
      expect(screen.getByText('No seats available')).toBeInTheDocument();
    });

    it('should display "1 seat left" for single seat', () => {
      const postWithOneSeat = { ...baseDriverPost, available_seats: 1 };
      render(<PostCardHeader post={postWithOneSeat} isDriverPost={true} isOwner={false} />);
      expect(screen.getByText('1 seat left')).toBeInTheDocument();
    });

    it('should display plural "seats left" for multiple seats', () => {
      const postWithMultipleSeats = { ...baseDriverPost, available_seats: 5 };
      render(<PostCardHeader post={postWithMultipleSeats} isDriverPost={true} isOwner={false} />);
      expect(screen.getByText('5 seats left')).toBeInTheDocument();
    });
  });

  describe('Passenger Posts', () => {
    it('should render passenger post with title and badge', () => {
      render(<PostCardHeader post={basePassengerPost} isDriverPost={false} isOwner={false} />);
      expect(screen.getByText('Need Ride')).toBeInTheDocument();
      expect(screen.getByText('👋 Passenger')).toBeInTheDocument();
    });

    it('should render fallback title for untitled passenger post', () => {
      const postWithoutTitle = { ...basePassengerPost, title: '' };
      render(<PostCardHeader post={postWithoutTitle} isDriverPost={false} isOwner={false} />);
      expect(screen.getByText('Untitled Ride Request')).toBeInTheDocument();
    });

    it('should not display price for passenger posts', () => {
      render(<PostCardHeader post={basePassengerPost} isDriverPost={false} isOwner={false} />);
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  describe('Round Trip', () => {
    it('should display return info for round trips', () => {
      const roundTripPost = {
        ...baseDriverPost,
        is_round_trip: true,
        return_date: '2025-01-05',
        return_time: '18:00:00',
      } as unknown as RidePostType;

      render(<PostCardHeader post={roundTripPost} isDriverPost={true} isOwner={false} />);
      expect(screen.getByText('↔️ Round Trip')).toBeInTheDocument();
      expect(screen.getByText(/Return:/)).toBeInTheDocument();
    });
  });

  describe('Owner Status', () => {
    it('should display status badge for owners', () => {
      render(<PostCardHeader post={baseDriverPost} isDriverPost={true} isOwner={true} />);
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should not display status badge for non-owners', () => {
      render(<PostCardHeader post={baseDriverPost} isDriverPost={true} isOwner={false} />);
      expect(screen.queryByText('active')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA label for price information', () => {
      render(<PostCardHeader post={baseDriverPost} isDriverPost={true} isOwner={false} />);
      const priceElement = screen.getByText('$50/seat');
      expect(priceElement).toHaveAttribute('aria-label', 'Price: 50 dollars per seat');
    });

    it('should have ARIA label for free rides', () => {
      const freePost = { ...baseDriverPost, price_per_seat: 0 };
      render(<PostCardHeader post={freePost} isDriverPost={true} isOwner={false} />);
      const priceElement = screen.getByText('Free');
      expect(priceElement).toHaveAttribute('aria-label', 'Free ride');
    });

    it('should have ARIA label for seats information', () => {
      const { container } = render(
        <PostCardHeader post={baseDriverPost} isDriverPost={true} isOwner={false} />
      );
      const seatsElement = container.querySelector('[aria-label="3 seats left"]');
      expect(seatsElement).toBeInTheDocument();
      expect(seatsElement).toHaveTextContent(/3 seats left/);
    });

    it('should have role and ARIA label for status badge', () => {
      render(<PostCardHeader post={baseDriverPost} isDriverPost={true} isOwner={true} />);
      const statusElement = screen.getByText('active');
      expect(statusElement).toHaveAttribute('role', 'status');
      expect(statusElement).toHaveAttribute('aria-label', 'Post status: active');
    });
  });
});
