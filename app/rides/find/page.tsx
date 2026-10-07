import Link from 'next/link';
import type { Metadata } from 'next';
import { getSEOTags } from '@/libs/seo';
import { createAdminClient } from '@/lib/supabase/server';
import config from '@/config';
import {
  fetchPublicRecentRides,
  fetchPublicUpcomingRides,
  type PublicRide,
} from '@/libs/rides/publicRides';
import PublicRideList from '@/components/rides/PublicRideList';

export const metadata: Metadata = getSEOTags({
  title: 'Find a Ride to Tahoe | RideShareTahoe',
  description:
    'Browse upcoming community carpools to Lake Tahoe from the Bay Area, Sacramento and Reno. See rides to Palisades, Northstar, Heavenly, Kirkwood and more, then sign in to message a driver or post your own.',
  canonicalUrlRelative: '/rides/find',
  // app/rides/layout.tsx marks the signed-in ride pages noindex. This public
  // directory is in the sitemap and must stay indexable, so override it here.
  extraTags: { robots: { index: true, follow: true } },
  openGraph: {
    title: 'Find a Ride to Tahoe | RideShareTahoe',
    description:
      'Browse upcoming community carpools to Lake Tahoe. Split gas, cut traffic, and meet mountain friends.',
    image: '/hero-bg.png',
  },
});

// The directory changes as people post, so render it on every request.
export const dynamic = 'force-dynamic';

interface LoadedRides {
  rides: PublicRide[];
  failed: boolean;
}

/**
 * Base tables are member-only. This server-side projection exposes only the
 * reduced public ride DTO, never private member or pickup details. A failure is
 * reported to the page so visitors see "could not load", not "no rides".
 */
async function loadRides(
  label: string,
  fetchRides: () => Promise<PublicRide[]>
): Promise<LoadedRides> {
  try {
    return { rides: await fetchRides(), failed: false };
  } catch (error) {
    console.error(`Public ride directory failed to load ${label} rides:`, error);
    return { rides: [], failed: true };
  }
}

export default async function FindRidePage() {
  const [upcoming, past] = await Promise.all([
    loadRides('upcoming', () => fetchPublicUpcomingRides(createAdminClient())),
    loadRides('recent', () => fetchPublicRecentRides(createAdminClient())),
  ]);
  const rides = upcoming.rides;
  const recent = past.rides;
  const loadFailed = upcoming.failed;
  const nothingUpcoming = rides.length === 0;
  const drivers = rides.filter((ride) => ride.postingType !== 'passenger');
  const passengers = rides.filter((ride) => ride.postingType === 'passenger');

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <section className="px-6 pt-20 pb-10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium tracking-widest text-slate-900 dark:text-white uppercase">
            RideShareTahoe
          </p>

          <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Find a carpool to Lake Tahoe
          </h1>

          <p className="mt-6 text-lg text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Every upcoming ride post from our community, open for anyone to browse. Drivers list
            empty seats and a fair share of gas. Passengers list where they need to go. Sign in
            (free, takes a minute) to see profiles and send a message.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/rides/post"
              className="bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-2xl px-10 py-3 font-semibold shadow-2xl transition hover:scale-[1.02] inline-flex items-center justify-center"
            >
              Post a Ride
            </Link>

            <Link
              href="/how-to-use"
              className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-4 font-medium"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {loadFailed && (
        <section className="px-6 pb-10" role="alert">
          <div className="max-w-5xl mx-auto rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <p className="font-semibold">We could not load the ride board right now.</p>
            <p className="mt-1">
              Please refresh in a minute. If it keeps happening, email {config.resend.supportEmail}.
            </p>
          </div>
        </section>
      )}

      <section className="px-6 pb-16" aria-labelledby="drivers-heading">
        <div className="max-w-5xl mx-auto">
          <h2
            id="drivers-heading"
            className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
          >
            Drivers with open seats
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {loadFailed
              ? 'Driver posts are unavailable while the board reloads.'
              : drivers.length === 0
                ? 'No driver posts yet for upcoming dates. Posts pick up as ski season gets closer.'
                : `${drivers.length} upcoming ${drivers.length === 1 ? 'trip' : 'trips'} with room for passengers.`}
          </p>
          <PublicRideList
            rides={drivers}
            showEmptyState={!loadFailed && nothingUpcoming && recent.length === 0}
          />
        </div>
      </section>

      <section className="px-6 pb-20" aria-labelledby="passengers-heading">
        <div className="max-w-5xl mx-auto">
          <h2
            id="passengers-heading"
            className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
          >
            Passengers looking for a ride
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {loadFailed
              ? 'Ride requests are unavailable while the board reloads.'
              : passengers.length === 0
                ? 'No ride requests yet for upcoming dates. Driving up with empty seats? Post your trip and riders will find you.'
                : `${passengers.length} ${passengers.length === 1 ? 'person' : 'people'} hoping to join a car heading up.`}
          </p>
          {passengers.length > 0 && <PublicRideList rides={passengers} />}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="px-6 pb-20" aria-labelledby="recent-heading">
          <div className="max-w-5xl mx-auto">
            <h2
              id="recent-heading"
              className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
            >
              Recent trips from the community
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {nothingUpcoming
                ? 'Nothing posted for upcoming dates yet. These are real rides members shared over the past year, so you can see what a post looks like and what people usually chip in.'
                : 'Rides members shared over the past year.'}
            </p>
            <PublicRideList rides={recent} mode="past" showEmptyState={false} />
          </div>
        </section>
      )}

      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            New here? Here is how it works
          </h2>
          <p className="mt-3 text-slate-700 dark:text-slate-300">
            RideShareTahoe is a free carpool board run by ShareVita, a California 501(c)(3)
            nonprofit. Drivers only ask passengers to chip in for gas, tolls and parking, never a
            profit. Read the{' '}
            <Link href="/how-to-use#cost-sharing" className="underline underline-offset-4">
              cost-sharing guide
            </Link>
            , check the{' '}
            <Link href="/tahoe-resorts" className="underline underline-offset-4">
              resorts and routes guide
            </Link>
            , or see{' '}
            <Link href="/our-story" className="underline underline-offset-4">
              who we are
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
