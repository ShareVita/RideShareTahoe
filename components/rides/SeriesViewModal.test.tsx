import { render, screen, fireEvent } from '@testing-library/react';
import SeriesViewModal from './SeriesViewModal';
import type { RidePostType } from '@/app/community/types';

// Mock the rideGrouping module
jest.mock('@/libs/rideGrouping', () => ({
  filterDepartureLegs: jest.fn((rides) =>
    rides.filter((r: RidePostType) => !r.trip_direction || r.trip_direction === 'departure')
  ),
}));

// Mock ride data
const mockRides: RidePostType[] = [
  {
    id: 'ride-1',
    poster_id: 'user-1',
    posting_type: 'driver',
    title: 'Weekend Trip',
    start_location: 'San Francisco',
    end_location: 'Lake Tahoe',
    departure_date: '2025-02-01',
    departure_time: '08:00',
    status: 'active',
    created_at: '2025-01-15T00:00:00Z',
    is_recurring: true,
    round_trip_group_id: 'group-1',
    available_seats: 3,
  },
  {
    id: 'ride-2',
    poster_id: 'user-1',
    posting_type: 'driver',
    title: 'Weekend Trip',
    start_location: 'San Francisco',
    end_location: 'Lake Tahoe',
    departure_date: '2025-02-08',
    departure_time: '08:00',
    status: 'active',
    created_at: '2025-01-15T00:00:00Z',
    is_recurring: true,
    round_trip_group_id: 'group-1',
    available_seats: 2,
  },
];

describe('SeriesViewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    rides: mockRides,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date to be before the rides
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-20'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when isOpen is false', () => {
    render(<SeriesViewModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing when rides array is empty', () => {
    const { container } = render(<SeriesViewModal {...defaultProps} rides={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays the modal title', () => {
    render(<SeriesViewModal {...defaultProps} />);
    expect(screen.getByText('Ride Series')).toBeInTheDocument();
  });

  it('displays the correct ride count', () => {
    render(<SeriesViewModal {...defaultProps} />);
    expect(screen.getByText('2 rides scheduled')).toBeInTheDocument();
  });

  it('displays singular text for single ride', () => {
    render(<SeriesViewModal {...defaultProps} rides={[mockRides[0]]} />);
    expect(screen.getByText('1 ride scheduled')).toBeInTheDocument();
  });

  it('displays the route information', () => {
    render(<SeriesViewModal {...defaultProps} />);
    expect(screen.getByText(/San Francisco.*Lake Tahoe/)).toBeInTheDocument();
  });

  it('displays the ride title', () => {
    render(<SeriesViewModal {...defaultProps} />);
    expect(screen.getByText('Weekend Trip')).toBeInTheDocument();
  });

  it('displays formatted dates for each ride', () => {
    render(<SeriesViewModal {...defaultProps} />);
    expect(screen.getByText('Feb 1, 2025')).toBeInTheDocument();
    expect(screen.getByText('Feb 8, 2025')).toBeInTheDocument();
  });

  it('displays formatted times for each ride', () => {
    render(<SeriesViewModal {...defaultProps} />);
    const timeElements = screen.getAllByText('8:00 AM');
    expect(timeElements).toHaveLength(2);
  });

  it('displays available seats for each ride', () => {
    render(<SeriesViewModal {...defaultProps} />);
    expect(screen.getByText('3 seats available')).toBeInTheDocument();
    expect(screen.getByText('2 seats available')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<SeriesViewModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('marks past rides with "Past" badge', () => {
    // Set current date to after first ride
    jest.setSystemTime(new Date('2025-02-05'));

    render(<SeriesViewModal {...defaultProps} />);
    expect(screen.getByText('Past')).toBeInTheDocument();
  });

  it('calls onSelectRide when a ride is clicked and handler is provided', () => {
    const onSelectRide = jest.fn();
    render(<SeriesViewModal {...defaultProps} onSelectRide={onSelectRide} />);

    // Click on first ride
    fireEvent.click(screen.getByText('Feb 1, 2025'));
    expect(onSelectRide).toHaveBeenCalledWith(mockRides[0]);
  });

  it('shows round trip badge and return info when ride has return leg', () => {
    const ridesWithReturn: RidePostType[] = [
      {
        ...mockRides[0],
        id: 'ride-1',
      },
      {
        ...mockRides[0],
        id: 'ride-1-return',
        departure_date: '2025-02-02',
        departure_time: '17:00',
        trip_direction: 'return',
        start_location: 'Lake Tahoe',
        end_location: 'San Francisco',
      },
    ];

    render(<SeriesViewModal {...defaultProps} rides={ridesWithReturn} />);
    expect(screen.getByText('Round trip')).toBeInTheDocument();
    expect(screen.getByText(/Return:.*Feb 2, 2025/)).toBeInTheDocument();
  });
});
