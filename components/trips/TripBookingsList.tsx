import type { TripBooking, ProfileType, RidePostType } from '@/app/community/types';
import TripBookingCard from './TripBookingCard';
import Link from 'next/link';
import { formatDateLabel, formatTimeLabel } from '@/lib/dateFormat';

interface TripBookingsListProps {
  readonly bookings: TripBooking[];
  readonly role: 'driver' | 'passenger';
  // eslint-disable-next-line no-unused-vars
  readonly onUpdateStatus: (_bookingId: string, _status: TripBooking['status']) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  readonly onMessage: (_recipient: ProfileType, _ride: RidePostType | null) => void;
  readonly bookingActionLoadingIds: string[];
  // eslint-disable-next-line no-unused-vars
  readonly onCancelRequest: (_bookingId: string) => Promise<void>;
}

export default function TripBookingsList({
  bookings,
  role,
  onUpdateStatus,
  onMessage,
  bookingActionLoadingIds,
  onCancelRequest,
}: TripBookingsListProps) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
        <p className="mb-4 text-base text-gray-500 dark:text-gray-400">
          {role === 'driver'
            ? "You don't have any passengers booked yet."
            : "You haven't booked any rides yet."}
        </p>
        <Link
          href={role === 'driver' ? '/rides/post' : '/rides/find'}
          className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {role === 'driver' ? 'Post a Ride' : 'Find a Ride'}
        </Link>
      </div>
    );
  }

  if (role === 'driver') {
    const rides = new Map<string, TripBooking[]>();
    for (const booking of bookings) {
      if (!booking.ride) continue;
      const passengers = rides.get(booking.ride.id) ?? [];
      passengers.push(booking);
      rides.set(booking.ride.id, passengers);
    }

    return (
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from(rides, ([rideId, passengers]) => {
          const ride = passengers[0].ride!;
          return (
            <details
              key={rideId}
              className="group min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formatDateLabel(ride.departure_date) ?? 'Date TBD'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimeLabel(ride.departure_time) ?? 'Time TBD'} · Pacific time
                  </p>
                </div>
                <h3 className="break-words text-base font-semibold text-gray-900 dark:text-white">
                  {ride.start_location} → {ride.end_location}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {ride.total_seats != null && ride.available_seats != null
                    ? `${ride.available_seats} of ${ride.total_seats} seats available`
                    : 'Seat count not specified'}
                </p>
                <span className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                  <span>Manage passengers ({passengers.length})</span>
                  <span aria-hidden="true" className="group-open:rotate-180">
                    ⌄
                  </span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-gray-200 p-4 dark:border-slate-800">
                {passengers.map((booking) => (
                  <TripBookingCard
                    key={booking.id}
                    booking={booking}
                    role="driver"
                    compact
                    onUpdateStatus={onUpdateStatus}
                    onMessage={onMessage}
                    isSaving={bookingActionLoadingIds.includes(booking.id)}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {bookings.map((booking) => (
        <TripBookingCard
          key={booking.id}
          booking={booking}
          role={role}
          onUpdateStatus={onUpdateStatus}
          onMessage={onMessage}
          onCancelRequest={onCancelRequest}
          isSaving={bookingActionLoadingIds.includes(booking.id)}
        />
      ))}
    </div>
  );
}
