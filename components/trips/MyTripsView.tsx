'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import {
  fetchMyDriverTrips,
  fetchMyPassengerTrips,
  updateTripBooking,
} from '@/libs/community/tripsData';
import type { TripBooking, CommunityUser, ProfileType, RidePostType } from '@/app/community/types';
import TripBookingsList from '@/components/trips/TripBookingsList';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';

interface MyTripsViewProps {
  user: CommunityUser;
  supabase: CommunitySupabaseClient;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, ride: RidePostType | null) => void;
}

export default function MyTripsView({ user, supabase, onMessage }: Readonly<MyTripsViewProps>) {
  const [driverTrips, setDriverTrips] = useState<TripBooking[]>([]);
  const [passengerTrips, setPassengerTrips] = useState<TripBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingActionLoadingIds, setBookingActionLoadingIds] = useState<string[]>([]);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const [dt, pt] = await Promise.all([
        fetchMyDriverTrips(supabase, user.id),
        fetchMyPassengerTrips(supabase, user.id),
      ]);
      setDriverTrips(dt);
      setPassengerTrips(pt);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, user.id]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleUpdateBooking = async (bookingId: string, newStatus: TripBooking['status']) => {
    setBookingError(null);
    setBookingActionLoadingIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]));
    try {
      // Optimistic update could go here, but let's wait for server confirmation for safety
      await updateTripBooking(supabase, bookingId, { status: newStatus });

      // Update local state
      setDriverTrips((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      setPassengerTrips((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } catch (error) {
      console.error('Error updating booking:', error);
      setBookingError(
        typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Unable to update booking. Please refresh and try again.'
      );
    } finally {
      setBookingActionLoadingIds((prev) => prev.filter((id) => id !== bookingId));
    }
  };

  const handleCancelBookingRequest = useCallback(
    async (bookingId: string) => {
      setBookingError(null);
      setBookingActionLoadingIds((prev) =>
        prev.includes(bookingId) ? prev : [...prev, bookingId]
      );

      try {
        const response = await fetch(`/api/trips/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to cancel booking request');
        }

        await loadTrips();
      } catch (error) {
        console.error('Error cancelling booking request:', error);
        setBookingError(
          error instanceof Error ? error.message : 'Unable to cancel booking request'
        );
      } finally {
        setBookingActionLoadingIds((prev) => prev.filter((id) => id !== bookingId));
      }
    },
    [loadTrips]
  );

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 rounded-xl p-6 shadow-md border border-white/20 dark:border-slate-700/30 backdrop-blur-md">
      {bookingError && (
        <p role="alert" className="mb-4 text-red-700 dark:text-red-300">
          {bookingError}
        </p>
      )}
      <TabGroup>
        <TabList className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 dark:text-blue-100 transition-all duration-200
              ${
                selected
                  ? 'bg-white dark:bg-blue-600 shadow-sm'
                  : 'text-blue-100 hover:bg-white/12 hover:text-white'
              }`
            }
          >
            Trips I&apos;m Driving
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 dark:text-blue-100 transition-all duration-200
              ${
                selected
                  ? 'bg-white dark:bg-blue-600 shadow-sm'
                  : 'text-blue-100 hover:bg-white/12 hover:text-white'
              }`
            }
          >
            Trips I&apos;m Riding On
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <TripBookingsList
              bookings={driverTrips}
              role="driver"
              onUpdateStatus={handleUpdateBooking}
              onMessage={onMessage}
              bookingActionLoadingIds={bookingActionLoadingIds}
              onCancelRequest={handleCancelBookingRequest}
            />
          </TabPanel>
          <TabPanel>
            <TripBookingsList
              bookings={passengerTrips}
              role="passenger"
              onUpdateStatus={handleUpdateBooking}
              onMessage={onMessage}
              bookingActionLoadingIds={bookingActionLoadingIds}
              onCancelRequest={handleCancelBookingRequest}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
