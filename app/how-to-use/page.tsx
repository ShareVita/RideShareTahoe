import { Metadata } from 'next';
import Link from 'next/link';
import { metadata as pageMetadata } from './_metadata';
import FaqJsonLd from './FaqJsonLd';
import ScrollSpyToc from '@/components/HowTo/ScrollSpyToc';
import MobileToc from '@/components/HowTo/MobileToc';
import SectionHeading from '@/components/HowTo/SectionHeading';
import Callout from '@/components/HowTo/Callout';
import SafetyChecklist from '@/components/HowTo/SafetyChecklist';

export const metadata: Metadata = pageMetadata;

const SECTIONS = [
  { id: 'what-is-ridesharetahoe', label: 'What is RideShareTahoe?' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'understanding-posts', label: 'Understanding Ride Posts' },
  { id: 'creating-posts', label: 'Posting a Ride' },
  { id: 'finding-rides', label: 'Finding Rides' },
  { id: 'connecting', label: 'Connecting with Others' },
  { id: 'booking', label: 'Booking a Ride' },
  { id: 'reviews', label: 'Reviews & Trust' },
  { id: 'managing-posts', label: 'Managing Your Posts' },
  { id: 'account-management', label: 'Account Management' },
  { id: 'safety', label: 'Safety & Guidelines' },
  { id: 'getting-help', label: 'Getting Help' },
];

export default function HowToUsePage() {
  return (
    <>
      <FaqJsonLd />
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <main role="main" className="lg:col-span-3 space-y-12">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  🚗 How to Use RideShareTahoe
                </h1>
                <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                  Your complete guide to connecting with drivers and passengers for trips between
                  the Bay Area and Lake Tahoe.
                </p>
              </div>

              {/* Mobile TOC */}
              <MobileToc sections={SECTIONS} />

              {/* Section 1: What is RideShareTahoe */}
              <section id="what-is-ridesharetahoe">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="what-is-ridesharetahoe">
                    🚗 What is RideShareTahoe?
                  </SectionHeading>
                  <div className="prose prose-lg max-w-none mt-6">
                    <p className="text-gray-700 mb-4">
                      RideShareTahoe is a community-driven platform that connects drivers and
                      passengers for trips to and from Lake Tahoe. We believe in reducing our carbon
                      footprint, sharing costs, and building a stronger community of outdoor
                      enthusiasts.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mt-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl mb-2">🚗</div>
                        <h3 className="font-semibold text-gray-900 mb-2">For Drivers</h3>
                        <p className="text-sm text-gray-600">
                          Offer empty seats in your car, share gas costs, and meet new friends on
                          the way to the mountains.
                        </p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl mb-2">👋</div>
                        <h3 className="font-semibold text-gray-900 mb-2">For Passengers</h3>
                        <p className="text-sm text-gray-600">
                          Find a comfortable ride, avoid driving alone, and get to Tahoe affordably.
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl mb-2">🏔️</div>
                        <h3 className="font-semibold text-gray-900 mb-2">For Community</h3>
                        <p className="text-sm text-gray-600">
                          Connect with like-minded people who love the outdoors and care about the
                          environment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Getting Started */}
              <section id="getting-started">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="getting-started">🚀 Getting Started</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        1
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Create Your Profile
                        </h3>
                        <p className="text-gray-700 mb-2">
                          Start by creating your RideShareTahoe profile with basic information about
                          yourself.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          <li>Add your name, photo, and bio</li>
                          <li>Set your location (city)</li>
                          <li>Choose your role: Driver, Passenger, or Both</li>
                          <li>Link your social profiles for trust</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        2
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Verify Your Account
                        </h3>
                        <p className="text-gray-700 mb-2">
                          Building trust is key. Verify your email and phone number to show others
                          you&apos;re a real person.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        3
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Explore Rides</h3>
                        <p className="text-gray-700 mb-2">
                          Visit the Community page to see upcoming rides or post your own.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Understanding Ride Posts */}
              <section id="understanding-posts">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="understanding-posts">
                    📋 Understanding Ride Posts
                  </SectionHeading>
                  <div className="space-y-8 mt-6">
                    <Callout tone="blue" title="🚗 Driver Posts">
                      <p className="mb-3">
                        These are posts made by drivers who have empty seats and are offering a
                        ride.
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Departure date and time</li>
                        <li>Start and end locations</li>
                        <li>Number of available seats</li>
                        <li>Cost share per seat (for gas, tolls, parking)</li>
                        <li>Car details (type, AWD, ski rack)</li>
                        <li>Preferences (music, conversation, pets)</li>
                      </ul>
                    </Callout>

                    <Callout tone="green" title="👋 Passenger Requests">
                      <p className="mb-3">These are posts made by passengers looking for a ride.</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Desired departure date and time</li>
                        <li>Pick-up and drop-off locations</li>
                        <li>Number of seats needed</li>
                        <li>Willingness to share costs</li>
                        <li>Luggage/gear requirements</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 4: Creating Posts */}
              <section id="creating-posts">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="creating-posts">✏️ Posting a Ride</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        For Drivers: Offering a Ride
                      </h3>
                      <Callout tone="blue">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Go to the Community page and click &quot;Post a Ride&quot;</li>
                          <li>Select &quot;I&apos;m Driving&quot;</li>
                          <li>Enter your trip details (origin, destination, date, time)</li>
                          <li>Specify car details and available seats</li>
                          <li>Set your cost share (to split gas, tolls, parking)</li>
                          <li>
                            Add any special instructions (e.g., &quot;Meeting at Rockridge
                            BART&quot;)
                          </li>
                          <li>Publish your ride!</li>
                        </ol>
                      </Callout>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        For Passengers: Requesting a Ride
                      </h3>
                      <Callout tone="green">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Go to the Community page and click &quot;Post a Ride&quot;</li>
                          <li>Select &quot;I Need a Ride&quot;</li>
                          <li>Enter your trip details (origin, destination, date, time)</li>
                          <li>Specify how many seats you need</li>
                          <li>Add details about your gear (skis, snowboard, bags)</li>
                          <li>Publish your request!</li>
                        </ol>
                      </Callout>
                    </div>

                    <Callout tone="yellow" title="💡 Pro Tips for Great Posts:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Be specific about pick-up/drop-off points</li>
                        <li>Mention if you have a ski rack or roof box</li>
                        <li>Clarify your flexibility on timing</li>
                        <li>Use a clear, friendly description</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 5: Finding Rides */}
              <section id="finding-rides">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="finding-rides">🔍 Finding Rides</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <p className="text-gray-700 mb-4">
                      Use the filters on the Community page to find the perfect match for your trip.
                    </p>
                    <Callout tone="blue" title="Search Filters:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          <strong>Date:</strong> Find rides on specific days
                        </li>
                        <li>
                          <strong>Location:</strong> Search by city
                        </li>
                        <li>
                          <strong>Role:</strong> Filter by Drivers or Passengers
                        </li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 6: Connecting */}
              <section id="connecting">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="connecting">💬 Connecting with Others</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Sending Messages</h3>
                      <Callout tone="blue">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Find a ride post that interests you</li>
                          <li>Click the &quot;Message&quot; button</li>
                          <li>Introduce yourself and confirm details</li>
                          <li>Discuss pick-up location and luggage space</li>
                        </ol>
                      </Callout>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 7: Booking */}
              <section id="booking">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="booking">📅 Booking a Ride</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <p className="text-gray-700 mb-4">
                      Once you&apos;ve connected and agreed on the details, you can confirm the
                      ride.
                    </p>
                    <Callout tone="green" title="Confirming the Trip:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Confirm the exact time and meeting place</li>
                        <li>Exchange contact numbers for the day of travel</li>
                        <li>Agree on payment method (Cash, Venmo, etc.)</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 8: Reviews & Trust */}
              <section id="reviews">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="reviews">⭐ Reviews & Trust</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Leaving Reviews</h3>
                      <p className="text-gray-700 mb-4">
                        After a trip, leave a review to help build trust in the community.
                      </p>
                      <Callout tone="blue">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Go to the user&apos;s profile</li>
                          <li>Click &quot;Leave Review&quot;</li>
                          <li>Rate your experience (1-5 stars)</li>
                          <li>Write a comment about the ride</li>
                        </ol>
                      </Callout>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 9: Managing Posts */}
              <section id="managing-posts">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="managing-posts">⚙️ Managing Your Posts</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <p className="text-gray-700 mb-4">
                      Keep your posts up to date to ensure a smooth experience for everyone.
                    </p>
                    <Callout tone="yellow">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Edit your post if plans change</li>
                        <li>
                          Mark your post as &quot;Completed&quot; or delete it once the ride is full
                        </li>
                        <li>Respond to inquiries promptly</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 10: Account Management */}
              <section id="account-management">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="account-management">👤 Account Management</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <p className="text-gray-700 mb-4">
                      You can update your profile, vehicle details, and preferences in your account
                      settings.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 11: Safety */}
              <section id="safety">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="safety">🛡️ Safety & Guidelines</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <Callout tone="red" title="🚨 Safety First">
                      <p className="mb-3">Your safety is our top priority.</p>
                      <SafetyChecklist />
                    </Callout>
                    <div className="mt-4">
                      <Link
                        href="/community-guidelines"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Read our full Community Guidelines →
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 12: Getting Help */}
              <section id="getting-help">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="getting-help">🆘 Getting Help</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <p className="text-gray-700 mb-4">
                      Have questions or need assistance? Check out our FAQ or contact support.
                    </p>
                    <div className="flex space-x-4">
                      <Link href="/faq" className="text-blue-600 hover:text-blue-800 font-medium">
                        Visit FAQ →
                      </Link>
                      <a
                        href="mailto:support@ridesharetahoe.com"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Contact Support →
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Ready to hit the road?</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/community"
                    className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                  >
                    Find a Ride →
                  </Link>
                  <Link
                    href="/rides/post"
                    className="bg-linear-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-medium"
                  >
                    Post a Ride →
                  </Link>
                </div>
              </div>
            </main>

            {/* Desktop TOC Sidebar */}
            <aside className="hidden lg:block">
              <ScrollSpyToc sections={SECTIONS} />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
