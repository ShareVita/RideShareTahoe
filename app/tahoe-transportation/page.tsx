import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';

export const metadata = getSEOTags({
  title: 'Tahoe Transportation Guide – Shuttles, Buses & More | RideShareTahoe',
  description:
    'Complete guide to getting to and around Lake Tahoe — airport shuttles from Reno, Bay Area ski buses, local public transit, and resort shuttles. Plus find a carpool on RideShareTahoe.',
  canonicalUrlRelative: '/tahoe-transportation',
  keywords: [
    'lake tahoe transportation',
    'tahoe shuttle',
    'reno airport to tahoe',
    'tahoe shuttle from reno airport',
    'bay area to tahoe bus',
    'tahoe ski bus',
    'tahoe public transit',
    'TART bus tahoe',
    'lake link tahoe',
    'tahoe resort shuttle',
    'getting to lake tahoe without a car',
    'lake tahoe bus',
    'north lake tahoe express',
    'south tahoe airporter',
    'tahoe convoy',
  ],
  openGraph: {
    title: 'Tahoe Transportation Guide – Shuttles, Buses & More',
    description:
      'Shuttles from Reno, Bay Area ski buses, local transit, and resort shuttles. All your options for getting to & around Lake Tahoe.',
  },
});

function TransportCard({
  name,
  href,
  description,
}: {
  name: string;
  href: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="font-semibold text-blue-700 mb-1">
        {name} <span className="text-sm">↗</span>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}

export default function TahoeTransportation() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Getting To & Around Lake Tahoe</h1>
          <p className="text-gray-600 mb-3">
            Whether you&apos;re trying to get to your carpool pickup spot, need a ride from where
            your carpool drops you off, or can only find a ride one way — here are all the
            transportation options available to and around Lake Tahoe.
          </p>
          <p className="text-gray-600">
            Can&apos;t find what you need below?{' '}
            <Link href="/rides/find" className="text-blue-600 hover:text-blue-800 font-medium">
              Find a carpool on RideShareTahoe
            </Link>{' '}
            — community members post rides from the Bay Area, Sacramento, Reno, and beyond.
          </p>
        </div>

        {/* From Reno Airport */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            ✈️ From Reno Airport
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Flying into Reno-Tahoe International Airport (RNO)? These services go direct to Tahoe.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TransportCard
              name="North Lake Tahoe Express"
              href="https://northlaketahoeexpress.com/"
              description="Scheduled shuttle from Reno Airport to Truckee, Tahoe City, Kings Beach, and North Shore resorts."
            />
            <TransportCard
              name="South Tahoe Airporter"
              href="https://southtahoeairporter.com/"
              description="Direct Reno Airport service to South Lake Tahoe hotels and casinos."
            />
            <TransportCard
              name="Uber"
              href="https://www.uber.com/"
              description="On-demand rideshare from Reno Airport. Flexible if scheduled shuttles don't match your timing."
            />
            <TransportCard
              name="Lyft"
              href="https://www.lyft.com/"
              description="On-demand rideshare from Reno Airport. Another flexible option for direct point-to-point service."
            />
          </div>
        </div>

        {/* From the Bay Area */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            🌉 From the Bay Area
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Coming from the San Francisco Bay Area? These shuttle and transit options can get you to
            Tahoe on weekends and ski season.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TransportCard
              name="Tahoe Convoy"
              href="https://www.tahoeconvoy.com/"
              description="Weekend shuttle service from San Francisco to North Lake Tahoe. Great for ski weekends."
            />
            <TransportCard
              name="Sports Basement Ski Bus"
              href="https://shop.sportsbasement.com/pages/ski-bus"
              description="Seasonal ski bus trips from the Bay Area to Tahoe resorts. Packages often include lift tickets."
            />
            <TransportCard
              name="Amtrak (train to Truckee)"
              href="https://www.amtrak.com/"
              description="The California Zephyr runs from the Bay Area to Truckee. Connect to local transit from there to get around the lake."
            />
          </div>
        </div>

        {/* Getting Around — North Shore */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            🚌 Getting Around — North Shore
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Free and low-cost transit options for getting around Truckee, Tahoe City, Kings Beach,
            and the North Shore.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TransportCard
              name="Tahoe Truckee Area Regional Transit (TART)"
              href="https://tahoetruckeetransit.com/"
              description="Free public buses connecting Truckee, Tahoe City, and Kings Beach. Great for getting between North Shore towns."
            />
            <TransportCard
              name="TART Connect"
              href="https://tahoetruckeetransit.com/how-to-ride/tart-connect/"
              description="Free on-demand neighborhood shuttle — book via app for door-to-door service within designated zones."
            />
          </div>
        </div>

        {/* Getting Around — South Shore */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            🚌 Getting Around — South Shore
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Free transit options for South Lake Tahoe, Stateline, and the South Shore area.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TransportCard
              name="Tahoe Transportation District (TTD)"
              href="https://www.tahoetransportation.org/"
              description="Free fixed bus routes around South Lake Tahoe. Connects major areas along the South Shore."
            />
            <TransportCard
              name="Lake Link"
              href="https://www.tahoelakelink.com/"
              description="Free on-demand rides to beaches, trails, and nightlife around South Lake Tahoe. Operated by the Lake Tahoe Visitors Authority."
            />
          </div>
        </div>

        {/* Resort & Ski Shuttles */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            ⛷️ Resort & Ski Shuttles
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Most major resorts run free shuttles from town hubs and nearby lodging. Check their
            sites for current schedules — many hotels also offer complimentary local shuttles.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TransportCard
              name="Heavenly Mountain Resort"
              href="https://www.skiheavenly.com/"
              description="Check Heavenly's site for current shuttle schedules from South Lake Tahoe town hubs."
            />
            <TransportCard
              name="Northstar California Resort"
              href="https://www.northstarcalifornia.com/"
              description="Northstar offers shuttles from Truckee and surrounding areas. Check their site for schedule and stops."
            />
            <TransportCard
              name="Palisades Tahoe"
              href="https://www.palisadestahoe.com/"
              description="Free ski shuttles connecting Olympic Valley and Tahoe City. Check Palisades' site for current routes."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Still need a ride to or from Tahoe?
          </h2>
          <p className="text-blue-800 mb-5">
            RideShareTahoe connects people carpooling to and from Lake Tahoe. Split the drive and
            the cost with community members heading the same way — including one-way trips.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/rides/find"
              className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              Find a Ride
            </Link>
            <Link
              href="/rides/post"
              className="inline-block bg-white text-blue-600 border border-blue-300 font-medium px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors text-center"
            >
              Post a Ride
            </Link>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-4 pb-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
