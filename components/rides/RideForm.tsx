import React, { useState } from 'react';
import type { RidePostType, Vehicle } from '@/app/community/types';

interface RideFormProps {
  initialData?: Partial<RidePostType>;
  // eslint-disable-next-line no-unused-vars
  onSave: (_data: Partial<RidePostType>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
  vehicles?: Vehicle[];
}

/**
 * Form component for creating or editing a ride offer or request.
 * Handles both driver (offering) and passenger (requesting) modes.
 * Includes vehicle selection for drivers and round-trip logic.
 */
export default function RideForm({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  isEditing = false,
  vehicles = [],
}: Readonly<RideFormProps>) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<RidePostType>>({
    posting_type: 'driver',
    title: '',
    start_location: '',
    end_location: '',
    departure_date: '',
    departure_time: '',
    price_per_seat: 0,
    total_seats: 1,
    description: '',
    special_instructions: '',
    has_awd: false,
    is_round_trip: false,
    return_date: '',
    return_time: '',
    ...initialData,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let newValue: string | number | boolean = value;

    if (type === 'number') {
      newValue = Number.parseFloat(value);
    } else if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehicleId = e.target.value;
    setSelectedVehicleId(vehicleId);

    if (!vehicleId) return;

    const vehicle = vehicles.find((v) => v.id === vehicleId);

    if (vehicle) {
      const isAwd = vehicle.drivetrain === 'AWD' || vehicle.drivetrain === '4WD';
      setFormData((prev) => ({
        ...prev,
        // Combine make, model, year, color, and drivetrain into a descriptive string
        car_type: `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.color}) ${
          vehicle.drivetrain ? `- ${vehicle.drivetrain}` : ''
        }`,
        has_awd: isAwd,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate that return date is after departure date + time
    if (formData.is_round_trip && formData.return_date && formData.departure_date) {
      const departureDateTime = new Date(
        `${formData.departure_date}T${formData.departure_time || '00:00'}`
      );
      const returnDateTime = new Date(`${formData.return_date}T${formData.return_time || '00:00'}`);

      if (returnDateTime <= departureDateTime) {
        setError('Return trip must be after the departure trip.');
        return;
      }
    }

    await onSave(formData);
  };

  let submitLabel = 'Post Ride';
  if (isLoading) {
    submitLabel = 'Saving...';
  } else if (isEditing) {
    submitLabel = 'Update Ride';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Posting Type */}
      <div>
        <label
          htmlFor="posting_type"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          I am a...
        </label>
        <select
          id="posting_type"
          name="posting_type"
          value={formData.posting_type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          required
        >
          <option value="driver">Driver (Offering a ride)</option>
          <option value="passenger">Passenger (Looking for a ride)</option>
          <option value="flexible">Flexible (Either)</option>
        </select>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Ride Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title || ''}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          required
          placeholder="e.g., Weekend trip to Palisades"
        />
      </div>

      {/* Locations */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="start_location"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Start Location
          </label>
          <input
            type="text"
            id="start_location"
            name="start_location"
            value={formData.start_location}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            required
            placeholder="e.g., San Francisco"
          />
        </div>

        <div>
          <label
            htmlFor="end_location"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            End Location
          </label>
          <input
            type="text"
            id="end_location"
            name="end_location"
            value={formData.end_location}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            required
            placeholder="e.g., South Lake Tahoe"
          />
        </div>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="departure_date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Departure Date
          </label>
          <input
            type="date"
            id="departure_date"
            name="departure_date"
            value={formData.departure_date}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label
            htmlFor="departure_time"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Departure Time
          </label>
          <input
            type="time"
            id="departure_time"
            name="departure_time"
            value={formData.departure_time}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      {/* Round Trip */}
      <div className="flex items-center">
        <input
          id="is_round_trip"
          name="is_round_trip"
          type="checkbox"
          checked={formData.is_round_trip}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800"
        />
        <label
          htmlFor="is_round_trip"
          className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
        >
          This is a Round Trip
        </label>
      </div>

      {/* Return Date and Time - Only if Round Trip */}
      {formData.is_round_trip && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
          <div>
            <label
              htmlFor="return_date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Return Date
            </label>
            <input
              type="date"
              id="return_date"
              name="return_date"
              value={formData.return_date || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              required={formData.is_round_trip}
            />
          </div>

          <div>
            <label
              htmlFor="return_time"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Return Time
            </label>
            <input
              type="time"
              id="return_time"
              name="return_time"
              value={formData.return_time || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              required={formData.is_round_trip}
            />
          </div>
        </div>
      )}

      {/* Driver Specific Fields */}
      {formData.posting_type === 'driver' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="price_per_seat"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Cost Share per Seat ($)
            </label>
            <input
              type="number"
              id="price_per_seat"
              name="price_per_seat"
              value={formData.price_per_seat ?? ''}
              onChange={handleChange}
              min="0"
              step="1"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              For gas, tolls, and parking only. Drivers may not profit.
            </p>
          </div>

          <div>
            <label
              htmlFor="total_seats"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Total Seats Available
            </label>
            <input
              type="number"
              id="total_seats"
              name="total_seats"
              value={formData.total_seats ?? ''}
              onChange={handleChange}
              min="1"
              max="10"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Vehicle Info */}
      {formData.posting_type === 'driver' && (
        <div className="space-y-4">
          {vehicles.length > 0 ? (
            <div>
              <label
                htmlFor="vehicle_select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Select from My Vehicles <span className="text-red-500">*</span>
              </label>
              <select
                id="vehicle_select"
                value={selectedVehicleId}
                onChange={handleVehicleSelect}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">-- Select a vehicle --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} ({v.color})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    No vehicles registered
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      You need to add at least one vehicle before posting a driver ride.{' '}
                      <a
                        href="/vehicles"
                        className="font-medium underline hover:text-yellow-600 dark:hover:text-yellow-100"
                      >
                        Add a vehicle now
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description / Notes
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description || ''}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            placeholder="Tell us more about your trip..."
          />
        </div>
      </div>

      {/* Special Instructions */}
      <div>
        <label
          htmlFor="special_instructions"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Special Instructions
        </label>
        <div className="mt-1">
          <textarea
            id="special_instructions"
            name="special_instructions"
            rows={2}
            value={formData.special_instructions || ''}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            placeholder="e.g., No smoking, pets allowed in crate..."
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
