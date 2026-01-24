'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { formatDateMedium, formatTime12Hour } from '@/libs/dateTimeFormatters';
import { filterDepartureLegs } from '@/libs/rideGrouping';
import type { RidePostType } from '@/app/community/types';

interface SeriesViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rides: RidePostType[];
  // eslint-disable-next-line no-unused-vars
  onSelectRide?: (ride: RidePostType) => void;
}

/**
 * Modal to view all rides in a series.
 * Displays a list of all scheduled dates with their times.
 */
export default function SeriesViewModal({
  isOpen,
  onClose,
  rides,
  onSelectRide,
}: Readonly<SeriesViewModalProps>) {
  if (!rides.length) return null;

  const firstRide = rides[0];
  const route = {
    from: firstRide.start_location || 'Unknown',
    to: firstRide.end_location || 'Unknown',
  };

  // Filter to only departure legs for display
  const departureLegRides = filterDepartureLegs(rides);

  // Sort by departure date
  const sortedRides = [...departureLegRides].sort((a, b) => {
    return a.departure_date.localeCompare(b.departure_date);
  });

  // Check which rides are in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-6 w-6 text-indigo-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                      />
                    </svg>
                  </div>
                  <div>
                    <DialogTitle
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      Ride Series
                    </DialogTitle>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {sortedRides.length} ride{sortedRides.length !== 1 ? 's' : ''} scheduled
                    </p>
                  </div>
                </div>

                {/* Route */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {route.from} → {route.to}
                  </p>
                  {firstRide.title && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {firstRide.title}
                    </p>
                  )}
                </div>

                {/* Rides List */}
                <div className="space-y-2 max-h-80 overflow-y-auto mb-6">
                  {sortedRides.map((ride) => {
                    const rideDate = new Date(ride.departure_date + 'T00:00:00');
                    const isPast = rideDate < today;
                    const dateStr = formatDateMedium(ride.departure_date);
                    const timeStr = formatTime12Hour(ride.departure_time);

                    // Check if this ride has a return leg
                    const returnLeg = rides.find(
                      (r) =>
                        r.round_trip_group_id === ride.round_trip_group_id &&
                        r.trip_direction === 'return' &&
                        r.id !== ride.id
                    );

                    return (
                      <div
                        key={ride.id}
                        onClick={() => onSelectRide?.(ride)}
                        className={`p-3 rounded-lg border transition-colors ${
                          isPast
                            ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-60'
                            : onSelectRide
                              ? 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer'
                              : 'border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium text-sm ${
                                isPast
                                  ? 'text-gray-500 dark:text-gray-500'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {dateStr}
                            </span>
                            {isPast && (
                              <span className="text-xs text-gray-400 bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                Past
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              isPast
                                ? 'text-gray-400 dark:text-gray-500'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {timeStr}
                          </span>
                        </div>

                        {/* Return leg info */}
                        {returnLeg && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                              Round trip
                            </span>
                            <span>
                              Return: {formatDateMedium(returnLeg.departure_date)} at{' '}
                              {formatTime12Hour(returnLeg.departure_time)}
                            </span>
                          </div>
                        )}

                        {/* Seats info */}
                        {ride.available_seats !== null && ride.available_seats !== undefined && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {ride.available_seats} seat{ride.available_seats !== 1 ? 's' : ''}{' '}
                            available
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Close Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-gray-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
