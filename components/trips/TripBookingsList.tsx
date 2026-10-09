import type { TripBooking, ProfileType, RidePostType } from '@/app/community/types';
import TripBookingCard from './TripBookingCard';
import Link from 'next/link';

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

  return (
    <div className="space-y-4">
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
