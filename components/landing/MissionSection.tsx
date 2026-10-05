import Link from 'next/link';
import LEGAL from '@/lib/legal';

/**
 * A short, plain explanation of why RideShareTahoe exists and who runs it.
 * Sits below the "why" cards so the hero can stay focused on finding a ride,
 * while anyone scrolling learns within a screen that this is a nonprofit program.
 */
export default function MissionSection() {
  return (
    <section className="bg-slate-50 px-6 py-20" aria-labelledby="mission-heading">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
        <div className="md:col-span-5">
          <p className="text-sm font-medium tracking-widest uppercase text-slate-500">
            Why this exists
          </p>
          <h2
            id="mission-heading"
            className="mt-3 text-3xl md:text-4xl font-black leading-tight text-slate-900"
          >
            Half the cars on I-80 on a powder Saturday have empty seats.
          </h2>
          <p className="mt-6 text-slate-600">
            RideShareTahoe is run by{' '}
            <a
              href={LEGAL.umbrellaWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              ShareVita
            </a>
            , a California 501(c)(3) nonprofit. It is free, it has no ads, and nothing on it is for
            sale. Costs are covered by ShareVita and by donations.
          </p>
        </div>
        <div className="md:col-span-7 space-y-5 text-lg text-slate-700 leading-relaxed">
          <p>
            Most of what people need to get to the mountains is already in their neighborhood: a
            friend of a friend driving up Friday night with three empty seats. The hard part was
            finding them. The rides were scattered across group chats, Reddit threads and Facebook
            pages that only the already-connected could see.
          </p>
          <p>
            So we built one place to post and find them. Drivers recover their gas money. Riders
            without a car, or without a car they trust in the snow, get to the lake for the price of
            a tank split four ways. Everyone takes a few cars off the road. And a lot of first rides
            turn into a crew you keep skiing with.
          </p>
          <p>
            <Link href="/our-story" className="font-semibold underline underline-offset-4">
              Read the full story and who runs it
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
