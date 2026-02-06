'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { createClient } from '@/libs/supabase/client';
import {
  formatTime12Hour,
  formatDateMedium,
  formatDateTime,
  normalizeTime,
} from '@/libs/dateTimeFormatters';
import { extractSeriesGroups, filterDepartureLegs } from '@/libs/rideGrouping';
import type { SeriesGroup } from '@/libs/rideGrouping';
import { fetchMyRides } from '@/libs/community/ridesData';
import type { RidePostType, CommunityUser } from '@/app/community/types';
import { toast } from 'react-hot-toast';

interface InviteToRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  passengerId: string;
  passengerName: string;
  user: CommunityUser;
}

export default function InviteToRideModal({
  isOpen,
  onClose,
  passengerId,
  passengerName,
  user,
}: Readonly<InviteToRideModalProps>) {
  const [myRides, setMyRides] = useState<RidePostType[]>([]);
  const [seriesGroups, setSeriesGroups] = useState<SeriesGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedSeriesRideIds, setSelectedSeriesRideIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'list' | 'series-selection'>('list');

  useEffect(() => {
    if (isOpen && user) {
      const loadRides = async () => {
        setLoading(true);
        const supabase = createClient();
        try {
          const rides = await fetchMyRides(supabase, user);

          // Filter for active driver rides with available seats
          // Exclude return trip legs - only show departure legs
          // Include rides from today onwards, but exclude past rides from today
          const now = new Date();

          const driverRides = filterDepartureLegs(rides).filter((r) => {
            const rideDateTime = new Date(`${r.departure_date}T${r.departure_time}`);
            return (
              r.posting_type === 'driver' &&
              r.status === 'active' &&
              (r.available_seats || 0) > 0 &&
              rideDateTime >= now
            );
          });

          // Group series
          const series = extractSeriesGroups(driverRides);
          setSeriesGroups(series);

          // Get standalone rides (not part of any series)
          const standalone = driverRides.filter((r) => !r.round_trip_group_id || !r.is_recurring);
          setMyRides(standalone);

          // If there's only one series or one standalone ride, auto-select it
          if (series.length === 1 && standalone.length === 0) {
            setSelectedSeriesId(series[0].groupId);
            setView('series-selection');
          } else if (series.length === 0 && standalone.length === 1) {
            setSelectedRideId(standalone[0].id);
          }
        } catch (error) {
          console.error('Error loading my rides:', error);
          toast.error('Failed to load your rides');
        } finally {
          setLoading(false);
        }
      };
      loadRides();
    }
  }, [isOpen, user]);

  const handleSelectSeries = (groupId: string) => {
    setSelectedSeriesId(groupId);
    setSelectedSeriesRideIds(new Set()); // Start with nothing selected
    setView('series-selection');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedSeriesId(null);
    setSelectedRideId(null);
    setSelectedSeriesRideIds(new Set());
  };

  const toggleSeriesRide = (rideId: string) => {
    const newSelected = new Set(selectedSeriesRideIds);
    if (newSelected.has(rideId)) {
      newSelected.delete(rideId);
    } else {
      newSelected.add(rideId);
    }
    setSelectedSeriesRideIds(newSelected);
  };

  const handleInviteToSelectedRides = async () => {
    if (selectedSeriesRideIds.size === 0) {
      toast.error('Please select at least one trip');
      return;
    }

    const series = seriesGroups.find((s) => s.groupId === selectedSeriesId);
    if (!series) return;

    const selectedRides = series.rides.filter((r) => selectedSeriesRideIds.has(r.id));

    setInviting(true);
    try {
      // Send invitations for selected rides
      const invitations = selectedRides.map((ride) => {
        return {
          ride_id: ride.id,
          passenger_id: passengerId,
          pickup_location: ride.start_location || 'TBD',
          pickup_time: new Date(
            `${ride.departure_date}T${normalizeTime(ride.departure_time)}:00`
          ).toISOString(),
          driver_notes:
            selectedSeriesRideIds.size > 1
              ? `I'd like to offer you a ride for ${selectedSeriesRideIds.size} trips in this series!`
              : 'I saw your post and would like to offer you a ride!',
        };
      });

      const results = await Promise.allSettled(
        invitations.map((inv, index) =>
          fetch('/api/trips/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inv),
          }).then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(`Ride ${index + 1}: ${data.error || 'Failed'}`);
            }
            return data;
          })
        )
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected');

      if (failed.length > 0) {
        // Show user-friendly message
        if (succeeded > 0) {
          toast.error(
            `Sent ${succeeded} invitation${succeeded !== 1 ? 's' : ''}, but ${failed.length} failed. Some trips may already be booked.`
          );
        } else {
          // Check if it's a "already has booking" error
          const firstError = failed[0];
          const errorMsg = firstError.status === 'rejected' ? firstError.reason.message : '';

          if (
            errorMsg.includes('already has a booking') ||
            errorMsg.includes('already has') ||
            errorMsg.includes('existing')
          ) {
            toast.error(
              `Unable to send invitation. ${passengerName} may already have a booking for these trips.`
            );
          } else {
            toast.error('Failed to send invitations. Please try again.');
          }
        }
        return;
      }

      toast.success(
        `Invited ${passengerName} to ${selectedSeriesRideIds.size} ride${selectedSeriesRideIds.size !== 1 ? 's' : ''}!`
      );
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitations';
      toast.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

  const handleInviteToSingleRide = async () => {
    if (!selectedRideId) return;

    const selectedRide = myRides.find((r) => r.id === selectedRideId);

    if (!selectedRide) {
      toast.error('Could not find the selected ride');
      return;
    }

    if (!selectedRide.id || !selectedRide.departure_date || !selectedRide.departure_time) {
      toast.error('Ride data is incomplete');
      return;
    }

    setInviting(true);
    try {
      const pickupTime = new Date(
        `${selectedRide.departure_date}T${normalizeTime(selectedRide.departure_time)}:00`
      ).toISOString();

      const invitationData = {
        ride_id: selectedRide.id,
        passenger_id: passengerId,
        pickup_location: selectedRide.start_location || 'TBD',
        pickup_time: pickupTime,
        driver_notes: 'I saw your post and would like to offer you a ride!',
      };

      const response = await fetch('/api/trips/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitationData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Determine user-friendly error message
        let userMessage = 'Failed to send invitation. Please try again.';

        if (Array.isArray(data.error)) {
          userMessage = 'Unable to send invitation. Please check the ride details.';
        } else {
          const errorMessage = data.error || '';

          // Check for common error types and show friendly message
          if (
            errorMessage.includes('already has a booking') ||
            errorMessage.includes('already has') ||
            errorMessage.includes('existing')
          ) {
            userMessage = `Unable to send invitation. ${passengerName} may already have a booking for this ride.`;
          } else if (errorMessage.includes('no seats') || errorMessage.includes('seat')) {
            userMessage = 'This ride has no available seats.';
          } else if (errorMessage.includes('not active') || errorMessage.includes('inactive')) {
            userMessage = 'This ride is no longer active.';
          }
        }

        throw new Error(userMessage);
      }

      toast.success(`Invited ${passengerName} to ride!`);
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send invitation. Please try again.';
      toast.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

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
                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                >
                  {view === 'list' ? `Invite ${passengerName} to Ride` : 'Select Trips'}
                </DialogTitle>

                <div className="mt-4">
                  {loading && (
                    <div
                      className="flex justify-center py-4"
                      role="status"
                      aria-label="Loading rides"
                    >
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      <span className="sr-only">Loading your rides...</span>
                    </div>
                  )}

                  {!loading && view === 'list' && (
                    <>
                      {myRides.length === 0 && seriesGroups.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400">
                          You don&apos;t have any suitable active rides to offer. Please post a
                          driver ride first.
                        </p>
                      )}

                      {(myRides.length > 0 || seriesGroups.length > 0) && (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {/* Series Groups - Click to go directly to selection */}
                          {seriesGroups.map((series) => (
                            <button
                              key={series.groupId}
                              type="button"
                              onClick={() => handleSelectSeries(series.groupId)}
                              className="w-full border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer text-left"
                            >
                              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {series.title}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                      {series.rides.length} trips •{' '}
                                      {formatDateMedium(series.rides[0].departure_date)} -{' '}
                                      {formatDateMedium(
                                        series.rides[series.rides.length - 1].departure_date
                                      )}
                                    </p>
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                                      Click to select trips →
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}

                          {/* Standalone Rides */}
                          {myRides.map((ride) => (
                            <button
                              key={ride.id}
                              type="button"
                              onClick={() => setSelectedRideId(ride.id)}
                              className={`w-full p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                                selectedRideId === ride.id
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                  : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <p className="font-medium text-gray-900 dark:text-white">
                                {ride.title || `${ride.start_location} → ${ride.end_location}`}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {formatDateMedium(ride.departure_date)} at{' '}
                                {formatTime12Hour(ride.departure_time)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {ride.available_seats} seat{ride.available_seats !== 1 ? 's' : ''}{' '}
                                available
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {!loading && view === 'series-selection' && selectedSeriesId && (
                    <>
                      <button
                        type="button"
                        onClick={handleBackToList}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-3 flex items-center gap-1"
                      >
                        ← Back to all rides
                      </button>

                      {(() => {
                        const series = seriesGroups.find((s) => s.groupId === selectedSeriesId);
                        if (!series) return null;

                        return (
                          <div className="space-y-3">
                            {/* Route Info */}
                            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 mb-3">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {series.start_location} → {series.end_location}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Select the trips you want to invite {passengerName} to:
                              </p>
                            </div>

                            {/* Trip Selection */}
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {series.rides.map((ride) => (
                                <label
                                  key={ride.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    selectedSeriesRideIds.has(ride.id)
                                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedSeriesRideIds.has(ride.id)}
                                    onChange={() => toggleSeriesRide(ride.id)}
                                    className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                      {formatDateTime(ride.departure_date, ride.departure_time)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {ride.available_seats} seat
                                      {ride.available_seats !== 1 ? 's' : ''} available
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>

                            {/* Selected count */}
                            {selectedSeriesRideIds.size > 0 && (
                              <p className="text-sm text-indigo-600 dark:text-indigo-400">
                                {selectedSeriesRideIds.size} trip
                                {selectedSeriesRideIds.size !== 1 ? 's' : ''} selected
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={view === 'series-selection' ? handleBackToList : onClose}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    {view === 'series-selection' ? 'Back' : 'Cancel'}
                  </button>
                  {view === 'list' && myRides.length > 0 && (
                    <button
                      type="button"
                      disabled={!selectedRideId || inviting}
                      onClick={handleInviteToSingleRide}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                      {inviting ? 'Inviting...' : 'Invite'}
                    </button>
                  )}
                  {view === 'series-selection' && (
                    <button
                      type="button"
                      disabled={selectedSeriesRideIds.size === 0 || inviting}
                      onClick={handleInviteToSelectedRides}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                      {inviting ? 'Inviting...' : 'Invite'}
                    </button>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
