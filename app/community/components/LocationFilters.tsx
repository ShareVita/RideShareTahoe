'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { geocodeLocation } from '@/libs/geocoding';
import type { LocationFilterType } from '../types';

interface LocationFiltersProps {
  // eslint-disable-next-line no-unused-vars
  onDepartureFilterChange: (filter: LocationFilterType | null) => void;
  // eslint-disable-next-line no-unused-vars
  onDestinationFilterChange: (filter: LocationFilterType | null) => void;
  /** Optional status text that describes how many rides match the current filters. */
  ridesFoundLabel?: string;
}

/**
 * LocationFilters component provides two independent location search bars
 * for filtering rides or passengers by departure and destination locations.
 *
 * @param props - Handlers for updating filters and optional ride summary text.
 */
export function LocationFilters({
  onDepartureFilterChange,
  onDestinationFilterChange,
  ridesFoundLabel,
}: Readonly<LocationFiltersProps>) {
  // Departure filter state
  const [departureInput, setDepartureInput] = useState<string>('');
  const [departureFilter, setDepartureFilter] = useState<LocationFilterType | null>(null);
  const [departureRadius, setDepartureRadius] = useState<number>(25);
  const [departureLoading, setDepartureLoading] = useState<boolean>(false);
  const [departureError, setDepartureError] = useState<string | null>(null);

  // Destination filter state
  const [destinationInput, setDestinationInput] = useState<string>('');
  const [destinationFilter, setDestinationFilter] = useState<LocationFilterType | null>(null);
  const [destinationRadius, setDestinationRadius] = useState<number>(25);
  const [destinationLoading, setDestinationLoading] = useState<boolean>(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  // Departure handlers
  const handleDepartureSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const trimmedQuery = departureInput.trim();

    if (!trimmedQuery) {
      setDepartureError('Please enter a departure location');
      return;
    }

    setDepartureLoading(true);
    setDepartureError(null);

    try {
      const coords = await geocodeLocation(trimmedQuery);

      if (!coords) {
        setDepartureError('Location not found. Please try again.');
        setDepartureLoading(false);
        return;
      }

      const filter: LocationFilterType = {
        lat: coords.lat,
        lng: coords.lng,
        radius: departureRadius,
      };
      setDepartureFilter(filter);
      onDepartureFilterChange(filter);
      setDepartureLoading(false);
    } catch (err: unknown) {
      console.error('Geocoding error:', err);
      setDepartureError('Failed to geocode location. Please try again.');
      setDepartureLoading(false);
    }
  };

  const handleClearDeparture = (): void => {
    setDepartureInput('');
    setDepartureFilter(null);
    setDepartureError(null);
    onDepartureFilterChange(null);
  };

  const handleDepartureInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setDepartureInput(e.target.value);
    if (departureError) {
      setDepartureError(null);
    }
  };

  const handleDepartureRadiusChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newRadius = Number.parseInt(e.target.value, 10);
    setDepartureRadius(newRadius);

    // Update filter if one is active
    if (departureFilter) {
      const updatedFilter: LocationFilterType = {
        ...departureFilter,
        radius: newRadius,
      };
      setDepartureFilter(updatedFilter);
      onDepartureFilterChange(updatedFilter);
    }
  };

  // Destination handlers
  const handleDestinationSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const trimmedQuery = destinationInput.trim();

    if (!trimmedQuery) {
      setDestinationError('Please enter a destination location');
      return;
    }

    setDestinationLoading(true);
    setDestinationError(null);

    try {
      const coords = await geocodeLocation(trimmedQuery);

      if (!coords) {
        setDestinationError('Location not found. Please try again.');
        setDestinationLoading(false);
        return;
      }

      const filter: LocationFilterType = {
        lat: coords.lat,
        lng: coords.lng,
        radius: destinationRadius,
      };
      setDestinationFilter(filter);
      onDestinationFilterChange(filter);
      setDestinationLoading(false);
    } catch (err: unknown) {
      console.error('Geocoding error:', err);
      setDestinationError('Failed to geocode location. Please try again.');
      setDestinationLoading(false);
    }
  };

  const handleClearDestination = (): void => {
    setDestinationInput('');
    setDestinationFilter(null);
    setDestinationError(null);
    onDestinationFilterChange(null);
  };

  const handleDestinationInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setDestinationInput(e.target.value);
    if (destinationError) {
      setDestinationError(null);
    }
  };

  const handleDestinationRadiusChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newRadius = Number.parseInt(e.target.value, 10);
    setDestinationRadius(newRadius);

    // Update filter if one is active
    if (destinationFilter) {
      const updatedFilter: LocationFilterType = {
        ...destinationFilter,
        radius: newRadius,
      };
      setDestinationFilter(updatedFilter);
      onDestinationFilterChange(updatedFilter);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 dark:border-slate-700 mb-6">
      <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-2 sm:gap-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-50">
          Filter by Location
        </h3>
        {ridesFoundLabel && (
          <p role="status" className="text-sm text-gray-600 dark:text-slate-400">
            {ridesFoundLabel}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departure Filter */}
        <div className="space-y-3">
          <label
            htmlFor="departure-location-input"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Departure Location
          </label>

          {departureFilter && (
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                📍 Within {departureRadius} miles of {departureInput}
              </span>
              <button
                onClick={handleClearDeparture}
                className="text-xs text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
              >
                ✕ Clear
              </button>
            </div>
          )}

          {departureError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
              {departureError}
            </div>
          )}

          <form onSubmit={handleDepartureSubmit} className="space-y-3">
            <input
              id="departure-location-input"
              type="text"
              value={departureInput}
              onChange={handleDepartureInputChange}
              placeholder="e.g., San Francisco, CA or 94102"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 text-sm"
              disabled={departureLoading}
            />

            <div className="flex items-center space-x-3">
              <label
                htmlFor="departure-radius-slider"
                className="text-sm text-gray-600 dark:text-slate-400"
              >
                Radius:
              </label>
              <input
                id="departure-radius-slider"
                type="range"
                min="5"
                max="100"
                value={departureRadius}
                onChange={handleDepartureRadiusChange}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-slate-50 w-16">
                {departureRadius} mi
              </span>
            </div>

            <button
              type="submit"
              disabled={departureLoading || !departureInput.trim()}
              className="w-full bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {departureLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Search Departure</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Destination Filter */}
        <div className="space-y-3">
          <label
            htmlFor="destination-location-input"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Destination Location
          </label>

          {destinationFilter && (
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                📍 Within {destinationRadius} miles of {destinationInput}
              </span>
              <button
                onClick={handleClearDestination}
                className="text-xs text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
              >
                ✕ Clear
              </button>
            </div>
          )}

          {destinationError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
              {destinationError}
            </div>
          )}

          <form onSubmit={handleDestinationSubmit} className="space-y-3">
            <input
              id="destination-location-input"
              type="text"
              value={destinationInput}
              onChange={handleDestinationInputChange}
              placeholder="e.g., South Lake Tahoe, CA or 96150"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 text-sm"
              disabled={destinationLoading}
            />

            <div className="flex items-center space-x-3">
              <label
                htmlFor="destination-radius-slider"
                className="text-sm text-gray-600 dark:text-slate-400"
              >
                Radius:
              </label>
              <input
                id="destination-radius-slider"
                type="range"
                min="5"
                max="100"
                value={destinationRadius}
                onChange={handleDestinationRadiusChange}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-slate-50 w-16">
                {destinationRadius} mi
              </span>
            </div>

            <button
              type="submit"
              disabled={destinationLoading || !destinationInput.trim()}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {destinationLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Search Destination</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
