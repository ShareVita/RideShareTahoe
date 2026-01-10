import Link from 'next/link';
import type { Metadata } from 'next';
import { getSEOTags } from '@/libs/seo';

export const metadata: Metadata = getSEOTags({
  title: 'Find a Ride to Tahoe | RideShareTahoe',
  description:
    'Browse community carpools to Lake Tahoe from the Bay Area and beyond. Find rides to Palisades, Northstar, Heavenly, Kirkwood & more—or post your own ride.',
  canonicalUrlRelative: '/rides/find',
  openGraph: {
    title: 'Find a Ride to Tahoe | RideShareTahoe',
    description:
      'Browse community carpools to Lake Tahoe—split gas, cut traffic, and meet mountain friends.',
    image: '/hero-bg.png',
  },
});

export default function FindRidePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium tracking-widest text-slate-900 dark:text-white uppercase">
            RideShareTahoe
          </p>

          <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Find a carpool to Lake Tahoe
          </h1>

          <p className="mt-6 text-lg text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Browse ride posts headed to Tahoe from the Bay Area and beyond. Split gas, reduce
            traffic, and meet mountain friends — with rides commonly going to Palisades, Northstar,
            Heavenly, Kirkwood, and more.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/community"
              className="bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-2xl px-10 py-3 font-semibold shadow-2xl transition hover:scale-[1.02] inline-flex items-center justify-center"
            >
              Browse Rides
            </Link>

            <Link
              href="/rides/post"
              className="rounded-2xl px-10 py-3 font-semibold shadow-xl transition hover:scale-[1.02] inline-flex items-center justify-center border border-slate-200 text-slate-900 bg-white hover:bg-slate-50 dark:border-slate-800 dark:text-white dark:bg-slate-900 dark:hover:bg-slate-800"
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
    </main>
  );
}
