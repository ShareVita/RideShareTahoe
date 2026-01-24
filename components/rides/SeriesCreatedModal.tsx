'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { formatDateMedium, formatTime12Hour } from '@/libs/dateTimeFormatters';
import { filterDepartureLegsPartial } from '@/libs/rideGrouping';
import type { RidePostType } from '@/app/community/types';

interface SeriesCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  rides: Partial<RidePostType>[];
  onViewRides: () => void;
}

/**
 * Success confirmation modal shown after creating a multi-date ride series.
 * Displays a summary of all scheduled rides with dates and times.
 */
export default function SeriesCreatedModal({
  isOpen,
  onClose,
  rides,
  onViewRides,
}: Readonly<SeriesCreatedModalProps>) {
  if (!rides.length) return null;

  const firstRide = rides[0];
  const route = {
    from: firstRide.start_location || 'Unknown',
    to: firstRide.end_location || 'Unknown',
  };

  // Filter to only departure legs (not return legs) for display
  const departureLegRides = filterDepartureLegsPartial(rides);

  // Sort by departure date
  const sortedRides = [...departureLegRides].sort((a, b) => {
    const dateA = a.departure_date || '';
    const dateB = b.departure_date || '';
    return dateA.localeCompare(dateB);
  });

  const isSingleRide = sortedRides.length === 1;
  const title = isSingleRide ? 'Ride created' : 'Ride series created';

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
                {/* Success Icon */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-8 w-8 text-green-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                  >
                    {title}
                  </DialogTitle>
                </div>

                {/* Route */}
                <div className="mb-4">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {route.from} → {route.to}
                  </p>
                </div>

                {/* Rides List */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {isSingleRide ? '1 ride scheduled:' : `${sortedRides.length} rides scheduled:`}
                  </p>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {sortedRides.map((ride, index) => {
                      const dateStr = ride.departure_date
                        ? formatDateMedium(ride.departure_date)
                        : 'Unknown date';
                      const timeStr = ride.departure_time
                        ? formatTime12Hour(ride.departure_time)
                        : 'Unknown time';

                      // Check if this ride has a return leg
                      const hasReturn = rides.some(
                        (r) =>
                          r.round_trip_group_id === ride.round_trip_group_id &&
                          r.trip_direction === 'return'
                      );

                      return (
                        <li
                          key={ride.id || index}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <span className="text-gray-400">•</span>
                          <span className="font-medium">{dateStr}</span>
                          <span className="text-gray-500">–</span>
                          <span>{timeStr}</span>
                          {hasReturn && (
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                              Round trip
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onViewRides}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    OK
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
