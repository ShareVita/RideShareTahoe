import { render, screen, waitFor } from '@testing-library/react';
import RideForm from './RideForm';
import { Vehicle } from '@/app/community/types';
import userEvent from '@testing-library/user-event';
import { geocodeLocation } from '@/libs/geocoding';
import { readRideDraft } from '@/components/vehicles/rideDraft';

jest.setTimeout(10000);

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));
jest.mock('@/libs/geocoding', () => ({ geocodeLocation: jest.fn() }));

const mockVehicles: Vehicle[] = [
  {
    id: 'v1',
    owner_id: 'user1',
    make: 'Subaru',
    model: 'Outback',
    year: 2020,
    color: 'Blue',
    license_plate: 'TAHOE1',
    drivetrain: 'AWD',
  },
  {
    id: 'v2',
    owner_id: 'user1',
    make: 'Honda',
    model: 'Civic',
    year: 2018,
    color: 'Silver',
    drivetrain: 'FWD',
  },
];

describe('RideForm', () => {
  const mockOnSave = jest.fn().mockResolvedValue(undefined);
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockOnSave.mockResolvedValue(undefined);
    (geocodeLocation as jest.Mock).mockImplementation(async (place: string) =>
      place === 'San Francisco' ? { lat: 37.77, lng: -122.42 } : { lat: 39.17, lng: -120.14 }
    );
  });

  it('renders correctly with default driver state', () => {
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    // Check for Posting Type Select
    const postingTypeSelect = screen.getByLabelText(/I am a.../i);
    expect(postingTypeSelect).toBeInTheDocument();
    expect(postingTypeSelect).toHaveValue('driver');

    // Check for Title input
    expect(screen.getByLabelText(/Ride Title/i)).toBeInTheDocument();
  });

  it('preserves the complete draft through vehicle setup and submits the newly selected vehicle', async () => {
    const user = userEvent.setup();
    const initialData = {
      posting_type: 'driver' as const,
      title: 'Weekend trip',
      start_location: 'Truckee',
      end_location: 'Tahoe City',
      departure_date: '2026-12-20',
      departure_time: '08:15',
      is_round_trip: true,
      return_date: '2026-12-21',
      return_time: '17:30',
      price_per_seat: 27,
      total_seats: 3,
      description: 'Ski bags welcome',
      special_instructions: 'Meet by the station',
      has_awd: false,
    };
    const { unmount } = render(
      <RideForm
        initialData={initialData}
        draftOwnerId="user1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    await user.type(screen.getByLabelText(/Description \/ Notes/i), ' and boots');
    const link = screen.getByRole('link', { name: 'Add a vehicle now' });
    expect(link).toHaveAttribute('href', '/vehicles?next=%2Frides%2Fpost');
    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);
    const saved = readRideDraft();
    expect(saved?.data).toEqual(
      expect.objectContaining({ ...initialData, description: 'Ski bags welcome and boots' })
    );
    unmount();
    render(
      <RideForm
        initialData={saved!.data}
        initialVehicleId="v1"
        vehicles={mockVehicles}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText(/Select from My Vehicles/i)).toHaveValue('v1');
    expect(screen.getByLabelText(/Return Time/i)).toHaveValue('17:30');
    await user.click(screen.getByRole('button', { name: 'Post Ride' }));
    await waitFor(() =>
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          ...initialData,
          description: 'Ski bags welcome and boots',
          car_type: '2020 Subaru Outback (Blue) - AWD',
          has_awd: true,
        })
      )
    );
  });

  it('validates round trip return date', async () => {
    const user = userEvent.setup();
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    // Select Vehicle (Required for driver)
    await user.selectOptions(screen.getByLabelText(/Select from My Vehicles/i), 'v1');

    // Select Round Trip
    await user.click(screen.getByLabelText(/This is a Round Trip/i));

    // Fill required fields to avoid HTML5 validation blocking submission before our custom validation
    await user.type(screen.getByLabelText(/Ride Title/i), 'Test Ride');
    await user.type(screen.getByLabelText(/Start Location/i), 'A');
    await user.type(screen.getByLabelText(/End Location/i), 'B');

    // Fill output details
    await user.type(screen.getByLabelText(/Departure Date/i), '2025-12-25');
    await user.type(screen.getByLabelText(/Departure Time/i), '10:00');

    // Fill invalid return details (before departure)
    await user.type(screen.getByLabelText(/Return Date/i), '2025-12-24');
    await user.type(screen.getByLabelText(/Return Time/i), '10:00');

    // Submit
    await user.click(screen.getByRole('button', { name: /Post Ride/i }));

    await waitFor(() => {
      expect(screen.getByText(/Return trip must be after the departure trip/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  it('submits successfully with valid data', async () => {
    const user = userEvent.setup();
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    // Switch to Passenger
    await user.selectOptions(screen.getByLabelText(/I am a.../i), 'passenger');

    // Fill required fields
    await user.type(screen.getByLabelText(/Ride Title/i), 'Need a ride');
    await user.type(screen.getByLabelText(/Start Location/i), 'San Francisco');
    await user.type(screen.getByLabelText(/End Location/i), 'Tahoe City');
    await user.type(screen.getByLabelText(/Departure Date/i), '2025-12-25');
    await user.type(screen.getByLabelText(/Departure Time/i), '08:00');

    await user.click(screen.getByRole('button', { name: /Post Ride/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          start_lat: 37.77,
          start_lng: -122.42,
          end_lat: 39.17,
          end_lng: -120.14,
        })
      );
    });
  });

  it('sets has_awd based on selected vehicle drivetrain', async () => {
    const user = userEvent.setup();
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    // Select AWD Vehicle
    await user.selectOptions(screen.getByLabelText(/Select from My Vehicles/i), 'v1');

    // Fill required fields
    await user.type(screen.getByLabelText(/Ride Title/i), 'AWD Trip');
    await user.type(screen.getByLabelText(/Start Location/i), 'A');
    await user.type(screen.getByLabelText(/End Location/i), 'B');
    await user.type(screen.getByLabelText(/Departure Date/i), '2025-12-25');
    await user.type(screen.getByLabelText(/Departure Time/i), '08:00');

    await user.click(screen.getByRole('button', { name: /Post Ride/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          has_awd: true,
          car_type: expect.stringContaining('AWD'),
        })
      );
    });

    // Select FWD Vehicle
    await user.selectOptions(screen.getByLabelText(/Select from My Vehicles/i), 'v2');
    await user.click(screen.getByRole('button', { name: /Post Ride/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          has_awd: false,
          car_type: expect.stringContaining('FWD'),
        })
      );
    });
  });

  it('keeps the existing vehicle and coordinates on edit, and restores it after another selection', async () => {
    const user = userEvent.setup();
    render(
      <RideForm
        isEditing
        initialData={{
          title: 'Existing ride',
          start_location: 'Truckee',
          end_location: 'Tahoe City',
          departure_date: '2026-12-25',
          departure_time: '08:00:00',
          is_round_trip: true,
          trip_direction: 'departure',
          car_type: 'Original SUV',
          has_awd: true,
          start_lat: 39.32,
          start_lng: -120.18,
          end_lat: 39.17,
          end_lng: -120.14,
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        vehicles={mockVehicles}
      />
    );
    expect(screen.getByLabelText(/Select from My Vehicles/i)).toHaveValue('existing');
    await user.selectOptions(screen.getByLabelText(/Select from My Vehicles/i), 'v2');
    await user.selectOptions(screen.getByLabelText(/Select from My Vehicles/i), 'existing');
    await user.click(screen.getByRole('button', { name: 'Update Ride' }));
    await waitFor(() =>
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          car_type: 'Original SUV',
          has_awd: true,
          start_lat: 39.32,
          start_lng: -120.18,
        })
      )
    );
    expect(geocodeLocation).not.toHaveBeenCalled();
  });

  it('clears stale coordinates when an edited location cannot be mapped, but still saves', async () => {
    const user = userEvent.setup();
    (geocodeLocation as jest.Mock).mockResolvedValue(null);
    render(
      <RideForm
        isEditing
        initialData={{
          posting_type: 'passenger',
          title: 'Existing ride',
          start_location: 'Truckee',
          end_location: 'Tahoe City',
          departure_date: '2026-12-25',
          departure_time: '08:00',
          start_lat: 39.32,
          start_lng: -120.18,
          end_lat: 39.17,
          end_lng: -120.14,
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    await user.clear(screen.getByLabelText(/Start Location/i));
    await user.type(screen.getByLabelText(/Start Location/i), 'Unmapped location');
    await user.click(screen.getByRole('button', { name: 'Update Ride' }));
    await waitFor(() =>
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          start_lat: null,
          start_lng: null,
          end_lat: 39.17,
          end_lng: -120.14,
        })
      )
    );
  });

  it('rejects a Pacific DST gap before geocoding or saving', async () => {
    const user = userEvent.setup();
    render(
      <RideForm
        initialData={{
          posting_type: 'passenger',
          title: 'DST trip',
          start_location: 'Truckee',
          end_location: 'Tahoe City',
          departure_date: '2026-03-08',
          departure_time: '02:30',
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Post Ride' }));
    expect(screen.getByText(/valid departure date and time in Pacific/i)).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(geocodeLocation).not.toHaveBeenCalled();
  });
});
