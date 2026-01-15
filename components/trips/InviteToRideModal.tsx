'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { createClient } from '@/lib/supabase/client';
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
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && user) {
      const loadRides = async () => {
        setLoading(true);
        try {
          const rides = await fetchMyRides(supabase, user);
          // Filter for active driver rides with available seats
          const driverRides = rides.filter(
            (r) =>
              r.posting_type === 'driver' &&
              r.status === 'active' &&
              (r.available_seats || 0) > 0 &&
              new Date(r.departure_date) >= new Date()
          );
          setMyRides(driverRides);
        } catch (error) {
          console.error('Error loading my rides:', error);
        } finally {
          setLoading(false);
        }
      };
      loadRides();
    }
  }, [isOpen, user, supabase]);

  const handleInvite = async () => {
    if (!selectedRideId) return;

    const selectedRide = myRides.find((r) => r.id === selectedRideId);
    if (!selectedRide) return;

    setInviting(true);
    try {
      const pickupTime = new Date(
        `${selectedRide.departure_date}T${selectedRide.departure_time}`
      ).toISOString();

      const response = await fetch('/api/trips/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_id: selectedRideId,
          passenger_id: passengerId,
          pickup_location: selectedRide.start_location,
          pickup_time: pickupTime,
          driver_notes: 'I saw your post and would like to offer you a ride!',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = Array.isArray(data.error)
          ? data.error[0]?.message || 'Unable to send invitation'
          : data.error || 'Unable to send invitation';
        throw new Error(errorMessage);
      }

      toast.success(`Invited ${passengerName} to ride!`);
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to send invitation (${errorMessage})`);
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
                  Invite {passengerName} to Ride
                </DialogTitle>

                <div className="mt-4">
                  {loading && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {!loading && myRides.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400">
                      You don&apos;t have any suitable active rides to offer. Please post a driver
                      ride first.
                    </p>
                  )}
                  {!loading && myRides.length > 0 && (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {myRides.map((ride) => (
                        <button
                          key={ride.id}
                          type="button"
                          onClick={() => setSelectedRideId(ride.id)}
                          className={`w-full p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                            selectedRideId === ride.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {ride.title || `${ride.start_location} → ${ride.end_location}`}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(ride.departure_date).toLocaleDateString()} at{' '}
                            {ride.departure_time.slice(0, 5)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {ride.available_seats} seats left
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!selectedRideId || inviting}
                    onClick={handleInvite}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {inviting ? 'Inviting...' : 'Send Invitation'}
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
