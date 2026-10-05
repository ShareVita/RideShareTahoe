import Link from 'next/link';
import { formatDateLabel, formatTimeLabel } from '@/lib/dateFormat';
import type { PublicRide } from '@/libs/rides/publicRides';

const BADGES: Record<PublicRide['postingType'], { label: string; className: string }> = {
  driver: { label: 'Driver offering seats', className: 'bg-emerald-100 text-emerald-800' },
  passenger: { label: 'Passenger looking for a ride', className: 'bg-sky-100 text-sky-800' },
  flexible: { label: 'Flexible: can drive or ride', className: 'bg-amber-100 text-amber-800' },
};

type ListMode = 'upcoming' | 'past';

function PublicRideCard({ ride, mode }: { ride: PublicRide; mode: ListMode }) {
  const badge = BADGES[ride.postingType];
  const seats =
    ride.seatsAvailable !== null
      ? `${ride.seatsAvailable} ${ride.seatsAvailable === 1 ? 'seat' : 'seats'}`
      : null;
  const costShare =
    ride.postingType === 'driver'
      ? ride.pricePerSeat
        ? `$${ride.pricePerSeat} per seat toward gas`
        : 'Cost share arranged in chat'
      : 'Happy to chip in for gas';

  return (
    <li className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {formatDateLabel(ride.departureDate)} · {formatTimeLabel(ride.departureTime)}
          {ride.isRoundTrip && ride.returnDate
            ? ` · returns ${formatDateLabel(ride.returnDate)}`
            : ''}
        </span>
      </div>

      <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        {ride.from} <span aria-hidden="true">→</span> <span className="sr-only">to</span>
        {ride.to}
      </p>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
        {seats && (
          <div>
            <dt className="sr-only">Seats</dt>
            <dd>{seats}</dd>
          </div>
        )}
        <div>
          <dt className="sr-only">Cost share</dt>
          <dd>{costShare}</dd>
        </div>
        {ride.carType && (
          <div>
            <dt className="sr-only">Car</dt>
            <dd>
              {ride.carType}
              {ride.hasAwd ? ' · AWD' : ''}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Posted by {ride.posterLabel}
          {mode === 'past' ? ' · trip date has passed' : ''}
        </p>
        {mode === 'upcoming' ? (
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-900 dark:text-white underline underline-offset-4"
          >
            Sign in to message
          </Link>
        ) : (
          <Link
            href="/rides/post"
            className="text-sm font-semibold text-slate-900 dark:text-white underline underline-offset-4"
          >
            Post a ride like this
          </Link>
        )}
      </div>
    </li>
  );
}

/**
 * Read-only directory of upcoming ride posts for visitors who are not signed in.
 * Trip facts are public so people can see the community is real before joining.
 * Profiles, photos and messaging stay behind sign-in.
 */
export default function PublicRideList({
  rides,
  mode = 'upcoming',
  showEmptyState = true,
}: {
  rides: PublicRide[];
  mode?: ListMode;
  showEmptyState?: boolean;
}) {
  if (rides.length === 0 && !showEmptyState) return null;
  if (rides.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center">
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          No upcoming rides posted right now
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Posts pick up as ski season gets closer. Be the first: post a ride or a request and
          neighbors heading the same way will find you.
        </p>
        <Link
          href="/rides/post"
          className="mt-6 inline-flex rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 px-8 py-3 font-semibold"
        >
          Post a Ride
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {rides.map((ride) => (
        <PublicRideCard key={ride.id} ride={ride} mode={mode} />
      ))}
    </ul>
  );
}
