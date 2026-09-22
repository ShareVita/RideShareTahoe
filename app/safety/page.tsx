import Link from 'next/link';
import LEGAL from '@/lib/legal';
import { getSEOTags } from '@/libs/seo';

export const metadata = getSEOTags({
  title: 'Carpool Safety Tips | RideShareTahoe',
  description:
    'How to vet a driver or rider, agree on cost and pickup, and keep every Tahoe carpool safe for everyone in the car.',
  keywords: ['carpool safety', 'rideshare safety', 'Tahoe carpool tips'],
  canonicalUrlRelative: '/safety',
});

export default function SafetyGuidelines() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Safety Guidelines</h1>
            <p className="text-gray-600">
              Your safety is our priority. Please follow these guidelines to ensure safe and
              positive experiences.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            {/* First Meeting Safety */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-red-500 mr-3">⚠️</span>Before the Ride
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-semibold mb-2">Verify details before getting in!</p>
                <p className="text-red-700 text-sm">
                  Check the driver&apos;s profile, car make/model, and license plate.
                </p>
              </div>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Meet in public locations:</strong> Pick-up and drop-off should be in safe,
                  well-lit areas.
                </li>
                <li>
                  <strong>Share your trip details</strong> with a friend or family member.
                </li>
                <li>
                  <strong>Trust your instincts</strong> - if something feels off, don&apos;t
                  proceed.
                </li>
                <li>
                  <strong>Have your phone charged</strong> and easily accessible.
                </li>
              </ul>
            </section>

            {/* Communication Safety */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-green-500 mr-3">💬</span>Communication Safety
              </h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Use the platform&apos;s messaging system</strong> - keep communication
                  within RideShareTahoe until you meet.
                </li>
                <li>
                  <strong>Be cautious of users who:</strong>
                  <ul className="list-disc pl-6 mt-2">
                    <li>Ask for money outside of agreed ride costs</li>
                    <li>Pressure you to meet quickly or in private</li>
                    <li>Refuse to provide car details</li>
                    <li>Have incomplete or suspicious profiles</li>
                  </ul>
                </li>
                <li>
                  <strong>Ask questions</strong> about the route, stops, and luggage space.
                </li>
              </ul>
            </section>

            {/* Red Flags */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-red-500 mr-3">🚩</span>Red Flags to Watch For
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-semibold">
                  If you encounter any of these, stop communication and report the user:
                </p>
              </div>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Aggressive or threatening behavior</strong>
                </li>
                <li>
                  <strong>Requests for financial information</strong>
                </li>
                <li>
                  <strong>Inconsistent or suspicious stories</strong>
                </li>
                <li>
                  <strong>Pressure to move communication off the platform</strong>
                </li>
                <li>
                  <strong>Inappropriate or sexual comments</strong>
                </li>
                <li>
                  <strong>Unsafe driving history or vehicle condition</strong>
                </li>
              </ul>
            </section>

            {/* Emergency Procedures */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-orange-500 mr-3">🚨</span>Emergency Procedures
              </h2>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-orange-800 font-semibold">In case of emergency:</p>
              </div>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Call 911 immediately</strong> if you feel threatened or in danger.
                </li>
                <li>
                  <strong>Seek medical attention</strong> for any injuries.
                </li>
                <li>
                  <strong>Document everything</strong> - take photos, save messages, note details.
                </li>
                <li>
                  <strong>Report the incident</strong> to RideShareTahoe support.
                </li>
              </ul>
            </section>

            {/* Best Practices */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-green-500 mr-3">✅</span>Best Practices for Success
              </h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Be punctual</strong> - respect everyone&apos;s time.
                </li>
                <li>
                  <strong>Communicate clearly</strong> about delays or changes.
                </li>
                <li>
                  <strong>Be respectful</strong> of the driver&apos;s car and rules (music, food,
                  etc.).
                </li>
                <li>
                  <strong>Leave honest ratings and reviews</strong> to help the community.
                </li>
              </ul>
            </section>

            {/* Local Resources */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-purple-500 mr-3">📞</span>Important Contacts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Emergency Services</h3>
                  <p className="text-sm text-gray-700">911 - Emergency</p>
                  <p className="text-sm text-gray-700">Local Police Non-Emergency</p>
                  <p className="text-sm text-gray-700">Highway Patrol</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">RideShareTahoe Support</h3>
                  <p className="text-sm text-gray-700">Report Safety Issues</p>
                  <p className="text-sm text-gray-700">Block Users</p>
                  <p className="text-sm text-gray-700">General Support</p>
                </div>
              </div>
            </section>

            {/* Legal Disclosure */}
            <section className="mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">About RideShareTahoe</h3>
                <p className="text-blue-700 text-sm mb-3">{LEGAL.getCurrentDisclosure()}</p>
              </div>
            </section>

            {/* Disclaimer */}
            <section className="mb-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Disclaimer</h3>
                <p className="text-yellow-700 text-sm">
                  RideShareTahoe is a free marketplace platform that connects users. We do not
                  verify the identity, background, or trustworthiness of users. Users are
                  responsible for their own safety. Always use caution and follow these safety
                  guidelines.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium mb-4 sm:mb-0">
                ← Back to Home
              </Link>
              <div className="flex space-x-4">
                <Link href="/tos" className="text-blue-600 hover:text-blue-800 font-medium">
                  Terms of Service
                </Link>
                <Link
                  href="/privacy-policy"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
