import { render, screen, fireEvent } from '@testing-library/react';
import SeriesCreatedModal from './SeriesCreatedModal';
import type { RidePostType } from '@/app/community/types';

// Mock the rideGrouping module
jest.mock('@/libs/rideGrouping', () => ({
  filterDepartureLegsPartial: jest.fn((rides) =>
    rides.filter(
      (r: Partial<RidePostType>) => !r.trip_direction || r.trip_direction === 'departure'
    )
  ),
}));

// Mock ride data
const mockRides: Partial<RidePostType>[] = [
  {
    id: 'ride-1',
    title: 'Weekend Trip',
    start_location: 'San Francisco',
    end_location: 'Lake Tahoe',
    departure_date: '2025-02-01',
    departure_time: '08:00',
    trip_direction: 'departure',
  },
  {
    id: 'ride-2',
    title: 'Weekend Trip',
    start_location: 'San Francisco',
    end_location: 'Lake Tahoe',
    departure_date: '2025-02-08',
    departure_time: '08:00',
    trip_direction: 'departure',
  },
  {
    id: 'ride-3',
    title: 'Weekend Trip',
    start_location: 'San Francisco',
    end_location: 'Lake Tahoe',
    departure_date: '2025-02-15',
    departure_time: '08:00',
    trip_direction: 'departure',
  },
];

describe('SeriesCreatedModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    rides: mockRides,
    onViewRides: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<SeriesCreatedModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing when rides array is empty', () => {
    const { container } = render(<SeriesCreatedModal {...defaultProps} rides={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays "Ride series created" title for multiple rides', () => {
    render(<SeriesCreatedModal {...defaultProps} />);
    expect(screen.getByText('Ride series created')).toBeInTheDocument();
  });

  it('displays "Ride created" title for single ride', () => {
    render(<SeriesCreatedModal {...defaultProps} rides={[mockRides[0]]} />);
    expect(screen.getByText('Ride created')).toBeInTheDocument();
  });

  it('displays the route information', () => {
    render(<SeriesCreatedModal {...defaultProps} />);
    expect(screen.getByText(/San Francisco.*Lake Tahoe/)).toBeInTheDocument();
  });

  it('displays the correct ride count', () => {
    render(<SeriesCreatedModal {...defaultProps} />);
    expect(screen.getByText('3 rides scheduled:')).toBeInTheDocument();
  });

  it('displays "1 ride scheduled:" for single ride', () => {
    render(<SeriesCreatedModal {...defaultProps} rides={[mockRides[0]]} />);
    expect(screen.getByText('1 ride scheduled:')).toBeInTheDocument();
  });

  it('lists all scheduled rides with formatted dates', () => {
    render(<SeriesCreatedModal {...defaultProps} />);

    // Check that dates are displayed (format: "Feb 1, 2025")
    expect(screen.getByText('Feb 1, 2025')).toBeInTheDocument();
    expect(screen.getByText('Feb 8, 2025')).toBeInTheDocument();
    expect(screen.getByText('Feb 15, 2025')).toBeInTheDocument();
  });

  it('displays formatted times', () => {
    render(<SeriesCreatedModal {...defaultProps} />);

    // Check that times are displayed (format: "8:00 AM")
    const timeElements = screen.getAllByText('8:00 AM');
    expect(timeElements).toHaveLength(3);
  });

  it('calls onViewRides when OK button is clicked', () => {
    const onViewRides = jest.fn();
    render(<SeriesCreatedModal {...defaultProps} onViewRides={onViewRides} />);

    fireEvent.click(screen.getByRole('button', { name: /ok/i }));
    expect(onViewRides).toHaveBeenCalled();
  });

  it('shows round trip badge when ride has return leg', () => {
    const ridesWithReturn: Partial<RidePostType>[] = [
      {
        id: 'ride-1',
        title: 'Weekend Trip',
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        departure_date: '2025-02-01',
        departure_time: '08:00',
        trip_direction: 'departure',
        round_trip_group_id: 'group-1',
      },
      {
        id: 'ride-1-return',
        title: 'Weekend Trip',
        start_location: 'Lake Tahoe',
        end_location: 'San Francisco',
        departure_date: '2025-02-02',
        departure_time: '17:00',
        trip_direction: 'return',
        round_trip_group_id: 'group-1',
      },
    ];

    render(<SeriesCreatedModal {...defaultProps} rides={ridesWithReturn} />);
    expect(screen.getByText('Round trip')).toBeInTheDocument();
  });
});
