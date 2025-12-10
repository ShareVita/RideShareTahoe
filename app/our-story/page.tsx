'use client';

import Link from 'next/link';

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">Our Story</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              How a need for a ride became a community movement
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* How RideShareTahoe Began */}
        <section className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">How It Started</h2>
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
              spot someone going my way. The community <em>existed</em> &mdash; I just couldn&apos;t
              reach it.
            </p>
            <p>
              I was frustrated that there wasn&apos;t one place to connect with everyone, filter by
              date and destination, and actually match with the right people.
            </p>
            <p className="font-bold text-gray-900">So I built it.</p>
            <p>
              RideShareTahoe is my attempt to fix that chaos &mdash; to give mountain lovers one
              clean, simple, friendly place to connect. No more scattered group chats. No more
              digging. Just people helping each other get outside.
            </p>
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
                fee — drivers and passengers arrange cost-sharing directly.
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-3xl">🚗</span>
              <div>
                <strong className="block mb-1">Neighbors helping neighbors.</strong> Every
                connection is built on trust and shared interests.
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-3xl">🌱</span>
              <div>
                <strong className="block mb-1">Eco-Friendly.</strong> Carpooling reduces emissions
                and traffic congestion to Tahoe.
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-3xl">🔒</span>
              <div>
                <strong className="block mb-1">Safety through transparency.</strong> Users can link
                their social profiles to help others get to know them before riding.
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
              href="/community"
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
