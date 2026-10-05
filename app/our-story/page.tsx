import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';
import LEGAL from '@/lib/legal';

export const metadata = getSEOTags({
  title: 'About RideShareTahoe: Our Mission and Story',
  description:
    'RideShareTahoe is a free carpool program run by ShareVita, a California 501(c)(3) nonprofit. Learn our mission, who runs it, how it is funded, and how a search for a ride to the mountains became a community.',
  keywords: [
    'RideShareTahoe',
    'about',
    'our story',
    'ShareVita',
    'nonprofit carpool',
    'Tahoe carpool',
    'rideshare Lake Tahoe',
  ],
  canonicalUrlRelative: '/our-story',
});

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-sm font-medium tracking-widest text-blue-700 uppercase mb-3">
              About RideShareTahoe
            </p>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Neighbors sharing the drive to Tahoe
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A free, nonprofit-run carpool board for everyone who loves the mountains and would
              rather not drive up alone.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission */}
        <section
          className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8"
          aria-labelledby="mission"
        >
          <h2 id="mission" className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Our Mission
          </h2>
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p className="text-xl font-semibold text-gray-900">{LEGAL.programMission}</p>
            <p>
              RideShareTahoe is a program of{' '}
              <a
                href={LEGAL.umbrellaWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline underline-offset-4"
              >
                ShareVita
              </a>
              , a California 501(c)(3) nonprofit. {LEGAL.umbrellaMission} Our other program,
              ShareSkippy, pairs dog owners with neighbors who want time with a dog. The idea behind
              both is the same: most of what people need is already in their neighborhood, going
              unused. A spare seat on the way to the slopes. A free afternoon and a love of dogs. We
              build the simple, free tools that connect those neighbors. Think mutual aid, not a
              marketplace.
            </p>
            <p>
              For Tahoe, that looks like this. Every full car is three or four fewer cars idling on
              I-80 on a powder Saturday. Every shared trip puts a day on the mountain within reach
              for someone without a car, or without a car they trust in the snow. And a lot of first
              rides turn into the crew you keep going up with.
            </p>
          </div>
        </section>

        {/* How It Started */}
        <section
          className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8"
          aria-labelledby="started"
        >
          <h2 id="started" className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            How It Started
          </h2>
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p>
              The idea started with a simple problem: I wanted to go skiing, but I didn&apos;t have
              a car. Renting one was expensive, I didn&apos;t want to make the long drive by myself,
              and trying to find a ride felt like solving a puzzle with missing pieces. There were
              WhatsApp groups, Discord servers, Reddit threads, Facebook pages&hellip; all full of
              people offering or looking for rides.
            </p>
            <p>
              So I&apos;d spend half my night bouncing between them, scrolling endlessly, hoping to
              spot someone going my way. The community <em>existed</em>. I just couldn&apos;t reach
              it.
            </p>
            <p>
              I was frustrated that there wasn&apos;t one place to connect with everyone, filter by
              date and destination, and actually match with the right people.
            </p>
            <p className="font-bold text-gray-900">So I built it.</p>
            <p>
              RideShareTahoe is my attempt to fix that chaos: to give mountain lovers one clean,
              simple, friendly place to connect. No more scattered group chats. No more digging.
              Just people helping each other get outside.
            </p>
            <p className="text-gray-900">
              {LEGAL.founder}, founder of ShareVita and RideShareTahoe
            </p>
          </div>
        </section>

        {/* Who runs it, how it's funded */}
        <section className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8" aria-labelledby="who">
          <h2 id="who" className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Who Runs It and How It&apos;s Funded
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg text-gray-700 leading-relaxed">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">The people</h3>
              <p>
                RideShareTahoe is founded and run by {LEGAL.founder}, who still answers the support
                inbox, reviews reports, and posts rides herself. Community members keep it honest by
                leaving reviews after trips and flagging anything that feels off.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">The money</h3>
              <p>
                The site is 100% free. There is no membership fee, no booking fee, no ads and no
                data for sale. Costs are covered by ShareVita and by donations. Drivers and
                passengers settle gas, tolls and parking directly between themselves, following our{' '}
                <Link
                  href="/how-to-use#cost-sharing"
                  className="text-blue-700 underline underline-offset-4"
                >
                  cost-sharing guide
                </Link>
                .
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">The organization</h3>
              <p>
                ShareVita is a California nonprofit public benefit corporation recognized by the IRS
                as a 501(c)(3) public charity, EIN {LEGAL.ein}. Governance, privacy and compliance
                for RideShareTahoe sit with ShareVita. Reach us at{' '}
                <a
                  href={`mailto:${LEGAL.contact.support}`}
                  className="text-blue-700 underline underline-offset-4"
                >
                  {LEGAL.contact.support}
                </a>
                .
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">The rules</h3>
              <p>
                This is traditional carpooling, legal in California as cost-sharing. It is not a
                ride-hailing service and drivers may not profit. Everyone agrees to our{' '}
                <Link
                  href="/community-guidelines"
                  className="text-blue-700 underline underline-offset-4"
                >
                  community guidelines
                </Link>{' '}
                and{' '}
                <Link href="/safety" className="text-blue-700 underline underline-offset-4">
                  safety guidelines
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8" aria-labelledby="for">
          <h2 id="for" className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Who It&apos;s For
          </h2>
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p>
              Anyone who loves Tahoe and wants to get there with a lighter footprint. In practice
              that is mostly skiers and snowboarders living in San Francisco, Oakland and the East
              Bay, Sacramento and Reno, many of them with an Epic or Ikon pass and no car, or a car
              they would rather leave at home when chain controls go up.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Passengers</strong> who need a seat and are happy to split gas.
              </li>
              <li>
                <strong>Drivers</strong> who are going up anyway and have empty seats.
              </li>
              <li>
                <strong>New arrivals</strong> to the Bay who want a ski crew, not just a ride.
              </li>
              <li>
                <strong>Summer visitors</strong> too: hikers, climbers and lake days count.
              </li>
            </ul>
          </div>
        </section>

        {/* What Makes RideShareTahoe Different */}
        <section className="bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 md:p-12 mb-8 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
            What Makes RideShareTahoe Different
          </h2>
          <div className="space-y-6 text-lg leading-relaxed">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💛</span>
              <div>
                <strong className="block mb-1">Free for everyone.</strong> There&apos;s no platform
                fee. Drivers and passengers arrange cost-sharing directly.
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-3xl">🚗</span>
              <div>
                <strong className="block mb-1">Neighbors helping neighbors.</strong> Every
                connection is built on trust and shared interests, not on an algorithm.
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-3xl">🌱</span>
              <div>
                <strong className="block mb-1">Eco-friendly.</strong> Carpooling reduces emissions
                and traffic congestion to Tahoe.
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-3xl">🔒</span>
              <div>
                <strong className="block mb-1">Safety through transparency.</strong> Members link
                social profiles and leave reviews so you know who you&apos;re riding with.
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Ready to Join Our Community?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Share a ride, make a friend, and hit the road.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
            >
              Get Started
            </Link>
            <Link
              href="/rides/find"
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
            >
              Browse Rides
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
