import { render, screen, fireEvent } from '@testing-library/react';
import ScopeSelectionModal from './ScopeSelectionModal';
import type { RidePostType } from '@/app/community/types';

// Mock ride data
const mockRide: RidePostType = {
  id: 'ride-1',
  poster_id: 'user-1',
  posting_type: 'driver',
  title: 'Weekend Trip',
  start_location: 'San Francisco',
  end_location: 'Lake Tahoe',
  start_lat: null,
  start_lng: null,
  end_lat: null,
  end_lng: null,
  departure_date: '2025-02-01',
  departure_time: '08:00',
  is_round_trip: false,
  trip_direction: null,
  round_trip_group_id: 'group-1',
  is_recurring: true,
  recurring_days: null,
  pricing_type: null,
  price_per_seat: null,
  gas_estimate: null,
  total_seats: 4,
  available_seats: 3,
  car_type: null,
  has_awd: false,
  driving_arrangement: null,
  music_preference: null,
  conversation_preference: null,
  description: null,
  special_instructions: null,
  status: 'active',
  created_at: '2025-01-15T00:00:00Z',
  owner: null,
  return_date: null,
  return_time: null,
};

const mockSeriesRides: RidePostType[] = [
  { ...mockRide, id: 'ride-1', departure_date: '2025-02-01' },
  { ...mockRide, id: 'ride-2', departure_date: '2025-02-08' },
  { ...mockRide, id: 'ride-3', departure_date: '2025-02-15' },
];

describe('ScopeSelectionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    ride: mockRide,
    seriesRides: mockSeriesRides,
    onConfirm: jest.fn(),
    variant: 'delete' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<ScopeSelectionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders delete variant correctly', () => {
    render(<ScopeSelectionModal {...defaultProps} />);

    expect(screen.getByText('Delete recurring ride')).toBeInTheDocument();
    expect(screen.getByText('What would you like to delete?')).toBeInTheDocument();
  });

  it('renders edit variant correctly', () => {
    render(<ScopeSelectionModal {...defaultProps} variant="edit" />);

    expect(screen.getByText('Edit recurring ride')).toBeInTheDocument();
    expect(screen.getByText('What would you like to change?')).toBeInTheDocument();
  });

  it('displays all scope options', () => {
    render(<ScopeSelectionModal {...defaultProps} />);

    expect(screen.getByText('This date only')).toBeInTheDocument();
    expect(screen.getByText('This and all future dates')).toBeInTheDocument();
    expect(screen.getByText('Entire series')).toBeInTheDocument();
  });

  it('shows correct ride counts for each scope', () => {
    render(<ScopeSelectionModal {...defaultProps} />);

    // Single ride option shows "1 ride"
    expect(screen.getByText('1 ride')).toBeInTheDocument();
    // Future and All options both show "3 rides" (since all 3 are future rides)
    const threeRidesElements = screen.getAllByText('3 rides');
    expect(threeRidesElements).toHaveLength(2);
  });

  it('calls onConfirm with selected scope when confirm is clicked', () => {
    const onConfirm = jest.fn();
    render(<ScopeSelectionModal {...defaultProps} onConfirm={onConfirm} />);

    // Default selection is 'single'
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledWith('single');
  });

  it('calls onConfirm with "all" scope when entire series is selected', () => {
    const onConfirm = jest.fn();
    render(<ScopeSelectionModal {...defaultProps} onConfirm={onConfirm} />);

    // Select entire series
    fireEvent.click(screen.getByText('Entire series'));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(onConfirm).toHaveBeenCalledWith('all');
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<ScopeSelectionModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables buttons when isLoading is true', () => {
    render(<ScopeSelectionModal {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('shows loading text when isLoading is true for delete variant', () => {
    render(<ScopeSelectionModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('shows loading text when isLoading is true for edit variant', () => {
    render(<ScopeSelectionModal {...defaultProps} variant="edit" isLoading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('disables future option when there is only one future ride', () => {
    const singleFutureRide = [mockRide];
    render(<ScopeSelectionModal {...defaultProps} seriesRides={singleFutureRide} />);

    const futureOption = screen.getByLabelText(/this and all future dates/i);
    expect(futureOption).toBeDisabled();
  });
});
