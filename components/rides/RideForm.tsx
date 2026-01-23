import React, { useState } from 'react';
import type { RidePostType, Vehicle } from '@/app/community/types';
import { normalizeTime } from '@/libs/dateTimeFormatters';
import DatePicker from '@/components/ui/DatePicker';
import TimeInput from '@/components/ui/TimeInput';

interface RideFormProps {
  initialData?: Partial<RidePostType> | Partial<RidePostType>[];
  // eslint-disable-next-line no-unused-vars
  onSave: (data: Partial<RidePostType> | Partial<RidePostType>[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
  isSeriesEdit?: boolean;
  vehicles?: Vehicle[];
}

interface DateTimeEntry {
  date: string;
  departureTime: string;
  isRoundTrip: boolean;
  returnDate?: string;
  returnTime?: string;
  existingRideId?: string; // Track which rides already exist in DB
}

/**
 * Enhanced form component for creating or editing ride offers/requests.
 * Supports both single ride editing and multi-date series editing.
 */
export default function RideForm({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  isEditing = false,
  isSeriesEdit = false,
  vehicles = [],
}: Readonly<RideFormProps>) {
  const [error, setError] = useState<string | null>(null);

  // Initialize from either single ride or array of rides
  const initializeFromData = () => {
    if (!initialData) {
      return {
        dates: [],
        entries: {},
        formData: {
          posting_type: 'driver' as const,
          title: '',
          start_location: '',
          end_location: '',
          price_per_seat: 0,
          total_seats: 1,
          description: '',
          special_instructions: '',
          has_awd: false,
        },
      };
    }

    const ridesArray = Array.isArray(initialData) ? initialData : [initialData];
    const firstRide = ridesArray[0];

    const dates: string[] = [];
    const entries: Record<string, DateTimeEntry> = {};

    for (const ride of ridesArray) {
      if (ride.departure_date && !dates.includes(ride.departure_date)) {
        dates.push(ride.departure_date);
        entries[ride.departure_date] = {
          date: ride.departure_date,
          departureTime: normalizeTime(ride.departure_time),
          isRoundTrip: ride.is_round_trip || false,
          returnDate: ride.return_date ?? undefined,
          returnTime: normalizeTime(ride.return_time),
          existingRideId: ride.id, // Track existing rides
        };
      }
    }

    // Sort dates
    dates.sort();

    return {
      dates,
      entries,
      formData: {
        posting_type: (firstRide.posting_type || 'driver') as 'driver' | 'passenger' | 'flexible',
        title: firstRide.title || '',
        start_location: firstRide.start_location || '',
        end_location: firstRide.end_location || '',
        price_per_seat: firstRide.price_per_seat || 0,
        total_seats: firstRide.total_seats || 1,
        description: firstRide.description || '',
        special_instructions: firstRide.special_instructions || '',
        has_awd: firstRide.has_awd || false,
        car_type: firstRide.car_type,
      },
    };
  };

  const initialized = initializeFromData();

  const [selectedDates, setSelectedDates] = useState<string[]>(initialized.dates);
  const [dateTimeEntries, setDateTimeEntries] = useState<Record<string, DateTimeEntry>>(
    initialized.entries
  );
  const [formData, setFormData] = useState<Partial<RidePostType>>(initialized.formData);

  /**
   * Auto-select vehicle if editing.
   * This is derived state and should be initialized, not synchronized in an effect.
   */
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    if (!isEditing) return '';
    if (!vehicles.length) return '';
    if (!initialized.formData.car_type) return '';

    const matchingVehicle = vehicles.find((v) =>
      initialized.formData.car_type?.includes(`${v.year} ${v.make} ${v.model}`)
    );

    return matchingVehicle?.id ?? '';
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
        car_type: `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.color}) ${
          vehicle.drivetrain ? `- ${vehicle.drivetrain}` : ''
        }`,
        has_awd: isAwd,
      }));
    }
  };

  const handleDatesChange = (dates: string[]) => {
    setSelectedDates(dates);

    const newEntries = { ...dateTimeEntries };

    // Add new dates
    for (const date of dates) {
      if (!newEntries[date]) {
        newEntries[date] = {
          date,
          departureTime: '',
          isRoundTrip: false,
        };
      }
    }

    // Remove unselected dates
    for (const date of Object.keys(newEntries)) {
      if (!dates.includes(date)) {
        delete newEntries[date];
      }
    }

    setDateTimeEntries(newEntries);
  };

  // Remove individual date card (for series editing)
  const removeDate = (dateToRemove: string) => {
    if (selectedDates.length === 1) {
      alert(
        "You can't remove the last date. Use the main delete button to delete the entire ride."
      );
      return;
    }

    handleDatesChange(selectedDates.filter((d) => d !== dateToRemove));
  };

  const updateDateTime = (date: string, field: keyof DateTimeEntry, value: string | boolean) => {
    setDateTimeEntries((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
      },
    }));
  };

  const copyTimeToAll = (sourceDate: string) => {
    const sourceEntry = dateTimeEntries[sourceDate];
    if (!sourceEntry?.departureTime) return;

    const newEntries = { ...dateTimeEntries };
    for (const date of selectedDates) {
      if (date !== sourceDate) {
        newEntries[date] = {
          ...newEntries[date],
          departureTime: sourceEntry.departureTime,
        };
      }
    }
    setDateTimeEntries(newEntries);
  };

  const calculateDefaultReturnDate = (departureDate: string): string => {
    const date = new Date(departureDate + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  /**
   * Build ride objects from selected dates and form data.
   * Handles both single rides and multi-date series with round trips.
   */
  const buildRidesFromDates = (
    dates: string[],
    entries: Record<string, DateTimeEntry>,
    baseData: Partial<RidePostType>,
    seriesGroupId?: string
  ): Partial<RidePostType>[] => {
    const rides: Partial<RidePostType>[] = [];
    const isMultiDate = dates.length > 1;

    for (const date of dates) {
      const entry = entries[date];

      if (entry.isRoundTrip) {
        // Round trips get their own group ID (separate from series)
        const roundTripGroupId = crypto.randomUUID();

        // Departure leg
        rides.push({
          ...baseData,
          departure_date: date,
          departure_time: entry.departureTime,
          is_round_trip: true,
          trip_direction: 'departure',
          round_trip_group_id: roundTripGroupId,
          is_recurring: isMultiDate,
        });

        // Return leg (swap start/end locations)
        rides.push({
          ...baseData,
          departure_date: entry.returnDate,
          departure_time: entry.returnTime,
          start_location: baseData.end_location,
          end_location: baseData.start_location,
          is_round_trip: true,
          trip_direction: 'return',
          round_trip_group_id: roundTripGroupId,
          is_recurring: isMultiDate,
        });
      } else {
        // Single-direction rides share series group ID
        rides.push({
          ...baseData,
          departure_date: date,
          departure_time: entry.departureTime,
          is_round_trip: false,
          round_trip_group_id: seriesGroupId,
          is_recurring: isMultiDate,
        });
      }
    }

    return rides;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedDates.length === 0) {
      setError('Please select at least one date.');
      return;
    }

    // Validate all dates have times and round trip logic
    for (const date of selectedDates) {
      if (!dateTimeEntries[date]?.departureTime) {
        setError(`Please set departure time for ${date}`);
        return;
      }

      const entry = dateTimeEntries[date];
      if (entry.isRoundTrip) {
        if (!entry.returnDate || !entry.returnTime) {
          setError(`Please set return date and time for ${date}`);
          return;
        }

        // Validate return is after departure
        const departureDateTime = new Date(`${date}T${entry.departureTime}:00`);
        const returnDateTime = new Date(`${entry.returnDate}T${entry.returnTime}:00`);

        if (returnDateTime <= departureDateTime) {
          setError(`Return trip must be after the departure trip for ${date}`);
          return;
        }
      }
    }

    // Single ride edit (non-series)
    if (isEditing && !isSeriesEdit) {
      const entry = dateTimeEntries[selectedDates[0]];
      const updateData: Partial<RidePostType> = {
        ...formData,
        departure_date: selectedDates[0],
        departure_time: entry.departureTime,
        is_round_trip: entry.isRoundTrip,
        return_date: entry.returnDate,
        return_time: entry.returnTime,
      };

      await onSave(updateData);
      return;
    }

    // Series edit or create mode - build all rides
    const seriesGroupId = selectedDates.length > 1 ? crypto.randomUUID() : undefined;
    const allRides = buildRidesFromDates(selectedDates, dateTimeEntries, formData, seriesGroupId);

    if (allRides.length === 1) {
      await onSave(allRides[0]);
    } else {
      await onSave(allRides);
    }
  };

  let submitLabel = 'Post Ride';
  if (isLoading) {
    submitLabel = 'Saving...';
  } else if (isSeriesEdit) {
    submitLabel = `Update ${selectedDates.length} Rides`;
  } else if (isEditing) {
    submitLabel = 'Update Ride';
  } else if (selectedDates.length > 1) {
    submitLabel = `Post ${selectedDates.length} Rides`;
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

      {/* Multi-Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Dates <span className="text-red-500">*</span>
        </label>
        <DatePicker
          selectedDates={selectedDates}
          onDatesChange={handleDatesChange}
          placeholder="Click to select one or multiple dates"
        />
        {selectedDates.length > 0 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {selectedDates.length === 1
              ? '1 date selected'
              : `${selectedDates.length} dates selected`}
          </p>
        )}
      </div>

      {/* Trip Details - Individual Date Cards */}
      {selectedDates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Trip Details</h3>

          {selectedDates.map((date, index) => {
            const entry = dateTimeEntries[date];
            const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={date}
                className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-4 relative"
              >
                {/* Delete button - show when multiple dates OR when editing series */}
                {(selectedDates.length > 1 || isSeriesEdit) && (
                  <button
                    type="button"
                    onClick={() => removeDate(date)}
                    className="absolute top-3 right-3 px-3 py-1.5 text-xs font-semibold rounded-lg 
                               bg-red-600 text-white hover:bg-red-700 
                               dark:bg-red-600 dark:hover:bg-red-700
                               transition-colors shadow-sm hover:shadow-md"
                    title="Remove this date"
                  >
                    Delete
                  </button>
                )}

                {/* Date Header */}
                <div className="flex items-center justify-between pr-8">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {formattedDate}
                  </h4>
                </div>

                {/* Departure Time */}
                <TimeInput
                  value={entry?.departureTime || ''}
                  onChange={(time) => updateDateTime(date, 'departureTime', time)}
                  label="Departure Time"
                  required
                />

                {/* Copy time button - show below time input for first date only */}
                {selectedDates.length > 1 && index === 0 && entry?.departureTime && (
                  <button
                    type="button"
                    onClick={() => copyTimeToAll(date)}
                    className="w-full px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 
                               text-blue-700 dark:text-blue-300 rounded-lg 
                               hover:bg-blue-100 dark:hover:bg-blue-900/30 
                               transition-colors font-medium border border-blue-200 dark:border-blue-800"
                  >
                    Apply this time to all other dates
                  </button>
                )}

                {/* Round Trip Toggle */}
                <div className="flex items-start space-x-3 pt-2">
                  <input
                    id={`round_trip_${date}`}
                    type="checkbox"
                    checked={entry?.isRoundTrip || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      updateDateTime(date, 'isRoundTrip', isChecked);
                      if (isChecked && !entry?.returnDate) {
                        updateDateTime(date, 'returnDate', calculateDefaultReturnDate(date));
                        updateDateTime(date, 'returnTime', '17:00');
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`round_trip_${date}`}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Make this a round trip
                  </label>
                </div>

                {/* Return Trip Details */}
                {entry?.isRoundTrip && (
                  <div className="ml-7 space-y-3 pt-2 border-t border-gray-200 dark:border-slate-600">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Return trip details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DatePicker
                        selectedDates={entry?.returnDate ? [entry.returnDate] : []}
                        onDatesChange={(dates) =>
                          updateDateTime(date, 'returnDate', dates[0] || '')
                        }
                        minDate={date}
                        label="Return Date"
                        required
                        placeholder="Select return date"
                        singleSelect
                      />
                      <TimeInput
                        value={entry?.returnTime || ''}
                        onChange={(time) => updateDateTime(date, 'returnTime', time)}
                        label="Return Time"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
