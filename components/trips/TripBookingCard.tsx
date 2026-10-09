import type { TripBooking, ProfileType, RidePostType } from '@/app/community/types';
import Image from 'next/image';
import { formatDateLabel, formatTimeLabel, TAHOE_TIME_ZONE } from '@/lib/dateFormat';

interface TripBookingCardProps {
  booking: TripBooking;
  role: 'driver' | 'passenger';
  // eslint-disable-next-line no-unused-vars
  onUpdateStatus: (bookingId: string, status: TripBooking['status']) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, ride: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  onCancelRequest?: (bookingId: string) => Promise<void>;
  readonly isSaving?: boolean;
}

export default function TripBookingCard({
  booking,
  role,
  onUpdateStatus,
  onMessage,
  onCancelRequest,
  isSaving,
}: Readonly<TripBookingCardProps>) {
  const isDriver = role === 'driver';
  const otherPerson = isDriver ? booking.passenger : booking.driver;
  const ride = booking.ride;

  if (!ride || !otherPerson) return null; // Should not happen with inner joins

  const isRideActive = ride.status === 'active';
  // Allow messaging if the ride is active.
  const counterpartDeleted = !!otherPerson.deleted_at;
  const canMessage = isRideActive && !counterpartDeleted;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    invited: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  };

  const departureDateLabel = formatDateLabel(ride.departure_date);
  const pickupTime = booking.pickup_time ? new Date(booking.pickup_time) : null;

  return (
    <div className="grid min-h-max min-w-0 grid-rows-[auto_1fr] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:aspect-square dark:border-slate-800 dark:bg-slate-900">
      {/* Date & Status */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="min-w-0">
          <span className="block text-base font-bold text-gray-900 dark:text-white">
            {departureDateLabel ?? 'Date TBD'}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTimeLabel(ride.departure_time) ?? 'Time TBD'}</span> ·{' '}
            <span>Pacific time</span>
          </span>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status]}`}
        >
          {booking.status}
        </span>
      </div>

      {/* Ride Details */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-3 break-words text-base font-semibold text-gray-900 dark:text-white">
          {ride.start_location} → {ride.end_location}
        </h3>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
          <div className="min-w-0 break-words">
            <p className="font-medium text-gray-900 dark:text-white">Meeting Details</p>
            <p>{booking.pickup_location}</p>
            <p>
              {pickupTime && Number.isFinite(pickupTime.getTime())
                ? pickupTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: TAHOE_TIME_ZONE,
                    timeZoneName: 'short',
                  })
                : 'TBD'}
            </p>
          </div>
          <div className="min-w-0 break-words">
            <p className="font-medium text-gray-900 dark:text-white">
              {isDriver ? 'Passenger' : 'Driver'}
            </p>
            <div className="mt-1 flex items-center space-x-2">
              {otherPerson.profile_photo_url ? (
                <Image
                  src={otherPerson.profile_photo_url}
                  alt={otherPerson.first_name || 'User'}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
              )}
              <span>
                {otherPerson.first_name} {otherPerson.last_name}
              </span>
            </div>
          </div>
        </div>

        {counterpartDeleted && (
          <p className="mb-3 text-sm text-gray-500">
            This member deleted their account. Trip history is retained, but messaging and booking
            actions are unavailable.
          </p>
        )}
        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-2 [&>button]:min-h-11">
          {/* Message Button - Available for both roles */}
          <button
            onClick={() => onMessage(otherPerson, ride)}
            disabled={!canMessage}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
            title={
              counterpartDeleted
                ? 'This member deleted their account'
                : canMessage
                  ? 'Message'
                  : 'Messaging is disabled for inactive trips'
            }
          >
            Message
          </button>

          {!counterpartDeleted && !isDriver && booking.status === 'pending' && onCancelRequest && (
            <button
              type="button"
              onClick={() => void onCancelRequest(booking.id)}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Cancelling…' : 'Cancel request'}
            </button>
          )}

          {/* Driver Actions for Pending Requests */}
          {!counterpartDeleted && isDriver && booking.status === 'pending' && (
            <>
              <button
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                disabled={isSaving}
                onClick={() => onUpdateStatus(booking.id, 'confirmed')}
              >
                Accept
              </button>
              <button
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                disabled={isSaving}
                onClick={() => onUpdateStatus(booking.id, 'cancelled')}
              >
                Decline
              </button>
            </>
          )}

          {/* Passenger Actions for Invitations */}
          {!counterpartDeleted && !isDriver && booking.status === 'invited' && (
            <>
              <button
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                disabled={isSaving}
                onClick={() => onUpdateStatus(booking.id, 'confirmed')}
              >
                Accept Invitation
              </button>
              <button
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                disabled={isSaving}
                onClick={() => onUpdateStatus(booking.id, 'cancelled')}
              >
                Decline
              </button>
            </>
          )}

          {!counterpartDeleted && isDriver && booking.status === 'invited' && (
            <span className="self-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Invitation Sent
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
