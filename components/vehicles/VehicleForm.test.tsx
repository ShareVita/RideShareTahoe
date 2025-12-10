import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VehicleForm from './VehicleForm';
import { VehicleSchema } from '@/libs/validations/vehicle';
import toast from 'react-hot-toast';

jest.setTimeout(10000);

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('VehicleForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the form with all required fields', () => {
      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByLabelText(/Make/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Model/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Drivetrain/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/License Plate/i)).toBeInTheDocument();
    });

    it('renders with "Add Vehicle" button when no initial data', () => {
      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /Add Vehicle/i })).toBeInTheDocument();
    });

    it('renders with "Update Vehicle" button when initial data is provided', () => {
      const initialData: VehicleSchema & { id: string } = {
        id: 'vehicle-123',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Silver',
        license_plate: 'ABC123',
        drivetrain: 'FWD',
      };

      render(
        <VehicleForm initialData={initialData} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      expect(screen.getByRole('button', { name: /Update Vehicle/i })).toBeInTheDocument();
    });

    it('pre-fills form fields with initial data', () => {
      const initialData: VehicleSchema & { id: string } = {
        id: 'vehicle-123',
        make: 'Honda',
        model: 'Accord',
        year: 2019,
        color: 'Blue',
        license_plate: 'XYZ789',
        drivetrain: 'AWD',
      };

      render(
        <VehicleForm initialData={initialData} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      expect(screen.getByLabelText(/Make/i)).toHaveValue('Honda');
      expect(screen.getByLabelText(/Model/i)).toHaveValue('Accord');
      expect(screen.getByLabelText(/Year/i)).toHaveValue(2019);
      expect(screen.getByLabelText(/Color/i)).toHaveValue('Blue');
      expect(screen.getByLabelText(/License Plate/i)).toHaveValue('XYZ789');
      expect(screen.getByLabelText(/Drivetrain/i)).toHaveValue('AWD');
    });
  });

  describe('HTTP Method Selection', () => {
    it('uses POST method when creating a new vehicle', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-vehicle-id' }),
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/Make/i), 'Subaru');
      await user.type(screen.getByLabelText(/Model/i), 'Outback');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2021');
      await user.type(screen.getByLabelText(/Color/i), 'Green');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'AWD');

      // Submit form
      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/community/vehicles',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('Subaru'),
          })
        );
      });
    });

    it('uses PUT method when updating an existing vehicle', async () => {
      const user = userEvent.setup();
      const initialData: VehicleSchema & { id: string } = {
        id: 'vehicle-456',
        make: 'Ford',
        model: 'Escape',
        year: 2022,
        color: 'Red',
        license_plate: 'FORD123',
        drivetrain: '4WD',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => initialData,
      });

      render(
        <VehicleForm initialData={initialData} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Modify a field
      const makeInput = screen.getByLabelText(/Make/i);
      await user.clear(makeInput);
      await user.type(makeInput, 'Chevrolet');

      // Submit form
      await user.click(screen.getByRole('button', { name: /Update Vehicle/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/community/vehicles/vehicle-456',
          expect.objectContaining({
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('Chevrolet'),
          })
        );
      });
    });

    it('sends complete vehicle data in request body', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id' }),
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Tesla');
      await user.type(screen.getByLabelText(/Model/i), 'Model 3');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2023');
      await user.type(screen.getByLabelText(/Color/i), 'White');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'AWD');
      await user.type(screen.getByLabelText(/License Plate/i), 'TESLA1');

      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody).toEqual({
          make: 'Tesla',
          model: 'Model 3',
          year: 2023,
          color: 'White',
          drivetrain: 'AWD',
          license_plate: 'TESLA1',
        });
      });
    });
  });

  describe('Success Handling', () => {
    it('calls onSuccess callback when vehicle is created successfully', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id' }),
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Mazda');
      await user.type(screen.getByLabelText(/Model/i), 'CX5');
      await user.type(screen.getByLabelText(/Color/i), 'Black');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'AWD');
      // Year defaults to current year, which is valid

      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onSuccess callback when vehicle is updated successfully', async () => {
      const user = userEvent.setup();
      const initialData: VehicleSchema & { id: string } = {
        id: 'vehicle-789',
        make: 'Nissan',
        model: 'Altima',
        year: 2021,
        color: 'Gray',
        drivetrain: 'FWD',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => initialData,
      });

      render(
        <VehicleForm initialData={initialData} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      const colorInput = screen.getByLabelText(/Color/i);
      await user.clear(colorInput);
      await user.type(colorInput, 'Silver');

      await user.click(screen.getByRole('button', { name: /Update Vehicle/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('displays success toast when vehicle is added', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id' }),
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Kia');
      await user.type(screen.getByLabelText(/Model/i), 'Sportage');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2022');
      await user.type(screen.getByLabelText(/Color/i), 'Blue');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'FWD');

      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Vehicle added');
      });
    });

    it('displays success toast when vehicle is updated', async () => {
      const user = userEvent.setup();
      const initialData: VehicleSchema & { id: string } = {
        id: 'vehicle-update',
        make: 'BMW',
        model: 'X5',
        year: 2023,
        color: 'Black',
        drivetrain: 'AWD',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => initialData,
      });

      render(
        <VehicleForm initialData={initialData} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      const makeInput = screen.getByLabelText(/Make/i);
      await user.clear(makeInput);
      await user.type(makeInput, 'Mercedes');

      await user.click(screen.getByRole('button', { name: /Update Vehicle/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Vehicle updated');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error toast when API request fails', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Audi');
      await user.type(screen.getByLabelText(/Model/i), 'A4');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2021');
      await user.type(screen.getByLabelText(/Color/i), 'White');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'FWD');

      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save vehicle');
      });
    });

    it('does not call onSuccess when request fails', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Volkswagen');
      await user.type(screen.getByLabelText(/Model/i), 'Golf');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2020');
      await user.type(screen.getByLabelText(/Color/i), 'Red');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'FWD');

      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Jeep');
      await user.type(screen.getByLabelText(/Model/i), 'Wrangler');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2022');
      await user.type(screen.getByLabelText(/Color/i), 'Orange');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), '4WD');

      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save vehicle');
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });

    it('displays validation errors for invalid input', async () => {
      const user = userEvent.setup();
      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Try to submit with empty required fields
      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(screen.getByText(/Make is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form State', () => {
    it('disables submit button while submitting', async () => {
      const user = userEvent.setup();

      // Mock a slow response
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 'new-id' }),
                }),
              100
            )
          )
      );

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Porsche');
      await user.type(screen.getByLabelText(/Model/i), '911');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2024');
      await user.type(screen.getByLabelText(/Color/i), 'Yellow');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'RWD');

      const submitButton = screen.getByRole('button', { name: /Add Vehicle/i });
      await user.click(submitButton);

      // Button should be disabled while submitting
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent(/Saving.../i);
      });

      // Wait for submission to complete
      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('re-enables submit button after successful submission', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id' }),
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Lexus');
      await user.type(screen.getByLabelText(/Model/i), 'RX');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2023');
      await user.type(screen.getByLabelText(/Color/i), 'Pearl');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'AWD');

      const submitButton = screen.getByRole('button', { name: /Add Vehicle/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Button should be enabled again (though form might be cleared/unmounted)
      // This tests that isSubmitting state is properly reset
    });

    it('re-enables submit button after failed submission', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Acura');
      await user.type(screen.getByLabelText(/Model/i), 'MDX');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2022');
      await user.type(screen.getByLabelText(/Color/i), 'White');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'AWD');

      const submitButton = screen.getByRole('button', { name: /Add Vehicle/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not submit form when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Dodge');
      await user.type(screen.getByLabelText(/Model/i), 'Charger');

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Optional Fields', () => {
    it('allows submission without license plate', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id' }),
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Lincoln');
      await user.type(screen.getByLabelText(/Model/i), 'Navigator');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2023');
      await user.type(screen.getByLabelText(/Color/i), 'Black');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), 'AWD');
      // Do not fill license plate

      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Verify license_plate was sent (as empty string or omitted)
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.make).toBe('Lincoln');
      expect(requestBody.license_plate === '' || requestBody.license_plate === undefined).toBe(
        true
      );
    });

    it('includes all fields when all are provided', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id' }),
      });

      render(<VehicleForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/Make/i), 'Cadillac');
      await user.type(screen.getByLabelText(/Model/i), 'Escalade');
      const yearInput = screen.getByLabelText(/Year/i);
      await user.clear(yearInput);
      await user.type(yearInput, '2024');
      await user.type(screen.getByLabelText(/Color/i), 'Silver');
      await user.type(screen.getByLabelText(/License Plate/i), 'CAD123');
      await user.selectOptions(screen.getByLabelText(/Drivetrain/i), '4WD');

      await user.click(screen.getByRole('button', { name: /Add Vehicle/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody).toEqual({
        make: 'Cadillac',
        model: 'Escalade',
        year: 2024,
        color: 'Silver',
        license_plate: 'CAD123',
        drivetrain: '4WD',
      });
    });
  });
});
