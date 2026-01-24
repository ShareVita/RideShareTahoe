import { render, screen, waitFor } from '@testing-library/react';
import RideForm from './RideForm';
import { Vehicle } from '@/app/community/types';
import userEvent from '@testing-library/user-event';

jest.setTimeout(10000);

// Mock DatePicker
jest.mock('@/components/ui/DatePicker', () => {
  return function MockDatePicker({
    selectedDates,
    onDatesChange,
  }: {
    selectedDates: string[];
    // eslint-disable-next-line no-unused-vars
    onDatesChange: (dates: string[]) => void;
  }) {
    return (
      <div data-testid="date-picker">
        <button
          type="button"
          onClick={() => {
            const testDate = '2025-12-25';
            if (!selectedDates.includes(testDate)) {
              onDatesChange([...selectedDates, testDate]);
            }
          }}
        >
          {selectedDates.length > 0
            ? `${selectedDates.length} date(s) selected`
            : 'Click to select dates'}
        </button>
      </div>
    );
  };
});

// Mock TimeInput
jest.mock('@/components/ui/TimeInput', () => {
  return function MockTimeInput({
    value,
    onChange,
    label,
  }: {
    value: string;
    // eslint-disable-next-line no-unused-vars
    onChange: (value: string) => void;
    label: string;
  }) {
    return (
      <div>
        <label htmlFor={label.toLowerCase().replace(/\s+/g, '_')}>{label}</label>
        <input
          id={label.toLowerCase().replace(/\s+/g, '_')}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  };
});

const mockVehicles: Vehicle[] = [
  {
    id: 'v1',
    owner_id: 'user1',
    make: 'Subaru',
    model: 'Outback',
    year: 2020,
    color: 'Blue',
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
  });

  it('renders with default driver state', () => {
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    expect(screen.getByLabelText(/I am a.../i)).toHaveValue('driver');
    expect(screen.getByLabelText(/Ride Title/i)).toBeInTheDocument();
  });

  it('shows date cards after selecting dates', async () => {
    const user = userEvent.setup();
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    await user.click(screen.getByText(/Click to select dates/i));

    await waitFor(() => {
      expect(screen.getByText(/Trip Details/i)).toBeInTheDocument();
    });
  });

  it('submits successfully with valid passenger data', async () => {
    const user = userEvent.setup();
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    await user.selectOptions(screen.getByLabelText(/I am a.../i), 'passenger');
    await user.type(screen.getByLabelText(/Ride Title/i), 'Need a ride');
    await user.type(screen.getByLabelText(/Start Location/i), 'San Francisco');
    await user.type(screen.getByLabelText(/End Location/i), 'Tahoe City');
    await user.click(screen.getByText(/Click to select dates/i));

    await waitFor(() => {
      expect(screen.getByLabelText(/Departure Time/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Departure Time/i), '08:00');
    await user.click(screen.getByRole('button', { name: /Post Ride/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('sets has_awd based on vehicle drivetrain', async () => {
    const user = userEvent.setup();
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: /Select from My Vehicles/i })
      ).toBeInTheDocument();
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Select from My Vehicles/i }),
      'v1'
    );
    await user.type(screen.getByLabelText(/Ride Title/i), 'AWD Trip');
    await user.type(screen.getByLabelText(/Start Location/i), 'A');
    await user.type(screen.getByLabelText(/End Location/i), 'B');
    await user.click(screen.getByText(/Click to select dates/i));

    await waitFor(() => {
      expect(screen.getByLabelText(/Departure Time/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Departure Time/i), '08:00');
    await user.click(screen.getByRole('button', { name: /Post Ride/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          has_awd: true,
        })
      );
    });
  });

  it('validates date selection', async () => {
    const user = userEvent.setup();
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    await user.selectOptions(screen.getByLabelText(/I am a.../i), 'passenger');
    await user.type(screen.getByLabelText(/Ride Title/i), 'Need a ride');
    await user.type(screen.getByLabelText(/Start Location/i), 'SF');
    await user.type(screen.getByLabelText(/End Location/i), 'Tahoe');
    await user.click(screen.getByRole('button', { name: /Post Ride/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please select at least one date/i)).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel clicked', async () => {
    const user = userEvent.setup();
    render(<RideForm onSave={mockOnSave} onCancel={mockOnCancel} vehicles={mockVehicles} />);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
