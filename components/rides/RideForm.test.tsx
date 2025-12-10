import { render, screen, waitFor } from '@testing-library/react';
import RideForm from './RideForm';
import { Vehicle } from '@/app/community/types';
import userEvent from '@testing-library/user-event';

jest.setTimeout(10000);

// Mock dependencies
jest.mock('@/libs/supabase/client', () => ({
  createClient: jest.fn(),
}));

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
    mockOnSave.mockResolvedValue(undefined);
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
      expect(mockOnSave).toHaveBeenCalled();
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
});
