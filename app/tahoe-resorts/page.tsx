import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';

export const metadata = getSEOTags({
  title: 'Tahoe Ski Resorts & Carpool Routes Guide | RideShareTahoe',
  description:
    'Every Lake Tahoe ski resort with drive times from San Francisco, Oakland, Sacramento and Reno, I-80 vs US-50 route tips, chain control basics, and the Bay Area pickup spots carpoolers actually use.',
  canonicalUrlRelative: '/tahoe-resorts',
  keywords: [
    'tahoe ski resorts',
    'drive to tahoe from san francisco',
    'sacramento to tahoe drive',
    'reno to tahoe ski resorts',
    'i-80 chain control',
    'us-50 tahoe',
    'palisades tahoe carpool',
    'northstar carpool',
    'heavenly carpool',
    'kirkwood carpool',
    'sugar bowl carpool',
    'mt rose carpool',
    'tahoe carpool pickup spots',
  ],
  openGraph: {
    title: 'Tahoe Ski Resorts & Carpool Routes Guide',
    description:
      'Drive times, routes, chain controls and pickup spots for carpooling to every Tahoe resort.',
  },
});

interface Resort {
  name: string;
  area: string;
  route: string;
  driveTimes: string;
  pass: string;
  notes: string;
}

const RESORTS: Resort[] = [
  {
    name: 'Palisades Tahoe (Olympic Valley and Alpine)',
    area: 'North Lake, west shore, off CA-89 between Truckee and Tahoe City',
    route: 'I-80 to Truckee, then CA-89 south about 10 miles',
    driveTimes: 'SF 3 h 45 · Oakland 3 h 30 · Sacramento 2 h · Reno 1 h',
    pass: 'Ikon Pass',
    notes:
      'Two base areas joined by a gondola. Most carpools meet at Olympic Valley. Weekend parking fills early and close lots are paid; carpools with 3 or more riders have had preferred parking in past seasons, so check the resort site.',
  },
  {
    name: 'Northstar California',
    area: 'North Lake, between Truckee and Kings Beach on CA-267',
    route: 'I-80 to Truckee, then CA-267 south about 6 miles',
    driveTimes: 'SF 3 h 30 · Oakland 3 h 15 · Sacramento 1 h 50 · Reno 50 min',
    pass: 'Epic Pass',
    notes:
      'The closest big resort to I-80 after Sugar Bowl, which makes it a popular carpool target. Village parking is paid on weekends; free lots use a shuttle.',
  },
  {
    name: 'Heavenly Mountain Resort',
    area: 'South Lake Tahoe and Stateline, straddling the California and Nevada line',
    route: 'US-50 from Sacramento over Echo Summit, or I-80 to US-50 via Meyers',
    driveTimes: 'SF 3 h 45 · Oakland 3 h 30 · Sacramento 2 h · Reno 1 h 15',
    pass: 'Epic Pass',
    notes:
      'Three base areas. The gondola leaves from the Heavenly Village in town, so carpools can drop riders downtown and skip resort lots. Casinos and lodging are walkable.',
  },
  {
    name: 'Kirkwood Mountain Resort',
    area: 'South of the lake on CA-88, about 35 miles from South Lake Tahoe',
    route: 'US-50 to Meyers then CA-89 south to CA-88, or CA-88 all the way from Jackson',
    driveTimes: 'SF 3 h 45 · Oakland 3 h 30 · Sacramento 2 h · Reno 1 h 45',
    pass: 'Epic Pass',
    notes:
      'Remote, high and snowy, so it gets the most powder and the most chain controls. Carson Pass on CA-88 closes in big storms. A great carpool because solo driving here is a long day.',
  },
  {
    name: 'Sugar Bowl',
    area: 'Donner Summit on old US-40, right off I-80 at the Soda Springs exit',
    route: 'I-80 to Soda Springs or Norden exits, no lake roads needed',
    driveTimes: 'SF 3 h 15 · Oakland 3 h · Sacramento 1 h 30 · Reno 1 h',
    pass: 'Check the resort for current pass partners',
    notes:
      'The first major resort you reach from the Bay, which cuts 30 to 45 minutes off the drive compared with the lake. Parking at the Village gondola lot and Judah lodge fills on storm weekends.',
  },
  {
    name: 'Mt. Rose Ski Tahoe',
    area: 'Between Reno and Incline Village on NV-431, the Mt. Rose Highway',
    route: 'From Reno take NV-431 south about 25 miles; from the lake, NV-431 north from Incline',
    driveTimes: 'Reno 35 min · Sacramento 2 h 30 · SF 4 h · Oakland 3 h 45',
    pass: 'Check the resort for current pass partners',
    notes:
      'Highest base elevation at Tahoe, so good snow when the lake-level resorts are soft. The natural choice for Reno carpools. No lodging at the base, so almost everyone day-trips.',
  },
  {
    name: 'Boreal Mountain',
    area: 'Donner Summit, directly off I-80 at the Boreal/Castle Peak exit',
    route: 'I-80, exit right into the lot',
    driveTimes: 'SF 3 h · Oakland 2 h 50 · Sacramento 1 h 25 · Reno 55 min',
    pass: 'Check the resort for current pass partners',
    notes:
      'Small, night skiing, terrain parks. Popular for first trips and for riders who want to be home for dinner. Easy carpool logistics because it is on the freeway.',
  },
  {
    name: 'Sierra-at-Tahoe',
    area: 'On US-50 at Echo Summit, 12 miles west of South Lake Tahoe',
    route: 'US-50 from Sacramento, resort is before you reach the lake',
    driveTimes: 'SF 3 h 30 · Oakland 3 h 15 · Sacramento 1 h 45 · Reno 1 h 30',
    pass: 'Check the resort for current pass partners',
    notes:
      'Laid back, tree skiing, and you avoid South Lake traffic entirely. Free parking with a shuttle from the lower lots.',
  },
  {
    name: 'Homewood Mountain Resort',
    area: 'West shore on CA-89, 6 miles south of Tahoe City',
    route: 'I-80 to Truckee, CA-89 south through Tahoe City',
    driveTimes: 'SF 4 h · Oakland 3 h 45 · Sacramento 2 h 15 · Reno 1 h 10',
    pass: 'Check the resort for current access and pass partners',
    notes:
      'The lake views from the chairs are the draw. Small lots right on the highway. Access policies have changed in recent seasons, so confirm before you post a ride.',
  },
  {
    name: 'Diamond Peak',
    area: 'Incline Village, Nevada, on the north east shore',
    route: 'I-80 to Truckee then CA-267 and NV-28, or NV-431 from Reno',
    driveTimes: 'Reno 45 min · Sacramento 2 h 20 · SF 4 h · Oakland 3 h 45',
    pass: 'Independent, day tickets and own pass',
    notes:
      'Community-owned, family friendly, free parking, and quiet on powder days when the big names are mobbed. Good Reno and Incline carpool target.',
  },
  {
    name: 'Tahoe Donner, Donner Ski Ranch and Soda Springs',
    area: 'Truckee and Donner Summit',
    route: 'I-80, Donner Pass Road exits',
    driveTimes: 'SF 3 h to 3 h 15 · Sacramento 1 h 30 · Reno 45 min to 1 h',
    pass: 'Independent',
    notes:
      'Small hills that are perfect for learning, kids, and tubing. Cheap tickets, free parking, and the shortest drives from the Bay.',
  },
];

interface Origin {
  city: string;
  highway: string;
  meetingSpots: string;
  tips: string;
}

const ORIGINS: Origin[] = [
  {
    city: 'San Francisco',
    highway: 'Bay Bridge to I-80 east. For South Lake, I-80 to Sacramento then US-50.',
    meetingSpots:
      'Sports Basement Presidio or Bryant Street, Civic Center and Embarcadero BART, Safeway at Marina.',
    tips: 'Leave before 5:30 am on Saturdays or after 8 pm Friday to beat the Bay Bridge and Vacaville crawl. Carpool lanes on I-80 need 3 people during commute hours.',
  },
  {
    city: 'Oakland, Berkeley and the East Bay',
    highway: 'I-80 east from the MacArthur Maze. No bridge toll heading east.',
    meetingSpots:
      'Rockridge BART, MacArthur BART, West Oakland BART, Emeryville Public Market, El Cerrito del Norte BART for Richmond pickups.',
    tips: 'Rockridge BART is the single most common pickup spot on the site. The lot is easy to describe and has coffee.',
  },
  {
    city: 'Sacramento',
    highway:
      'US-50 east for South Lake, Sierra-at-Tahoe and Kirkwood. I-80 east for North Lake and Donner Summit.',
    meetingSpots:
      'Roseville Galleria area for I-80 trips, Folsom or El Dorado Hills park and rides for US-50.',
    tips: 'You are the natural midpoint. Bay Area drivers often pick up a Sacramento rider on the way, so post even if you only need the last two hours.',
  },
  {
    city: 'Reno and Sparks',
    highway:
      'I-80 west to Truckee for North Lake, NV-431 Mt. Rose Highway for Mt. Rose and Incline, US-395 and US-50 for South Lake.',
    meetingSpots: 'Reno-Tahoe Airport cell lot, Meadowood Mall, UNR campus, Sparks Galleria.',
    tips: 'Reno carpools fill the gap for people who fly in. Post airport pickups with the flight arrival time.',
  },
];

export default function TahoeResortsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Tahoe Ski Resorts and Carpool Routes
          </h1>
          <p className="text-gray-600 mb-3">
            Planning a ride post and not sure which resort, which highway, or where to meet? This
            guide covers every ski area around Lake Tahoe with approximate drive times from San
            Francisco, Oakland, Sacramento and Reno, the roads you will take, and the pickup spots
            RideShareTahoe members use most.
          </p>
          <p className="text-gray-600">
            Drive times are dry-road estimates on a normal weekend. Add an hour or more for storm
            days and holiday weekends, and always check{' '}
            <a
              href="https://quickmap.dot.ca.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              Caltrans QuickMap
            </a>{' '}
            or{' '}
            <a
              href="https://www.nvroads.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              Nevada 511
            </a>{' '}
            before you leave. Pass affiliations change between seasons, so confirm on the
            resort&apos;s own site.
          </p>
        </div>

        {/* Routes */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="routes">
          <h2 id="routes" className="text-2xl font-bold text-gray-900 mb-4">
            I-80 or US-50? Picking your road
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Interstate 80</strong> over Donner Summit (7,056 ft) is the main route from
              the Bay Area and Sacramento to Truckee and the North Lake resorts: Palisades,
              Northstar, Sugar Bowl, Boreal, Tahoe Donner and the Donner Summit hills. It is a
              divided freeway the whole way, plowed first, and it carries most of the weekend
              traffic.
            </p>
            <p>
              <strong>US Highway 50</strong> over Echo Summit (7,382 ft) is the route from
              Sacramento to South Lake Tahoe: Heavenly, Sierra-at-Tahoe and the turnoff to Kirkwood.
              It is two lanes for long stretches east of Placerville, so it closes more often in
              storms and backs up behind chain checks. From San Francisco the two routes take about
              the same time; pick by resort, not by road.
            </p>
            <p>
              <strong>From Reno</strong>, I-80 west reaches Truckee in about 35 minutes, and the Mt.
              Rose Highway (NV-431) climbs to Mt. Rose and drops into Incline Village for the east
              shore. US-395 south then US-50 west gets you to South Lake in a little over an hour.
            </p>
          </div>
        </section>

        {/* Chain controls */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="chains">
          <h2 id="chains" className="text-2xl font-bold text-gray-900 mb-4">
            Chain controls in plain English
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Caltrans posts chain requirements on signs and on QuickMap when it snows. The three
              levels you will see:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>R1:</strong> chains or snow tires required. Cars with mud-and-snow or winter
                rated tires on the drive wheels can pass without chains.
              </li>
              <li>
                <strong>R2:</strong> chains required on all vehicles except four-wheel drive or
                all-wheel drive with snow tires on all four wheels. This is the common storm-day
                level, and the reason an AWD car with good tires is worth a lot in a carpool post.
              </li>
              <li>
                <strong>R3:</strong> chains on every vehicle, no exceptions. Rare, and the highway
                usually closes soon after.
              </li>
            </ul>
            <p>
              Even if you drive AWD, California requires you to <em>carry</em> chains when controls
              are posted. Practice putting them on in your driveway, not on the shoulder at Kingvale
              in a blizzard. Chain installers along I-80 and US-50 charge around $40 to $60.
            </p>
            <p>
              <strong>For passengers:</strong> ask in the chat whether the driver has AWD or chains.
              It is a normal question and a good sign when the answer is quick.
            </p>
          </div>
        </section>

        {/* Origins */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="origins">
          <h2 id="origins" className="text-2xl font-bold text-gray-900 mb-4">
            Where carpools start: pickup spots by city
          </h2>
          <div className="space-y-6">
            {ORIGINS.map((origin) => (
              <div key={origin.city} className="border border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{origin.city}</h3>
                <dl className="space-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="font-medium text-gray-900">Roads</dt>
                    <dd>{origin.highway}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Common meeting spots</dt>
                    <dd>{origin.meetingSpots}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Local tip</dt>
                    <dd>{origin.tips}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* Resorts */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="resorts">
          <h2 id="resorts" className="text-2xl font-bold text-gray-900 mb-2">
            Resort by resort
          </h2>
          <p className="text-gray-600 mb-6">
            Listed roughly north to south, then around the lake. Drive times are approximate
            dry-road estimates from each city center.
          </p>
          <div className="space-y-6">
            {RESORTS.map((resort) => (
              <article key={resort.name} className="border border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900">{resort.name}</h3>
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="font-medium text-gray-900">Where</dt>
                    <dd>{resort.area}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Route</dt>
                    <dd>{resort.route}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Drive time</dt>
                    <dd>{resort.driveTimes}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Pass</dt>
                    <dd>{resort.pass}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-gray-700">{resort.notes}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Towns */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="towns">
          <h2 id="towns" className="text-2xl font-bold text-gray-900 mb-4">
            Not skiing? Rides to Truckee, South Lake and around the lake
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Plenty of posts are not about a resort at all. People need to get to a rental in
              Truckee, a friend&apos;s place in Kings Beach, a job in South Lake, or the Reno
              airport on Sunday night. Post the town and the time and let the right driver find you.
              In summer the same roads carry hikers to Desolation Wilderness, climbers to Donner
              Summit, and everyone to the beaches at Sand Harbor and Emerald Bay.
            </p>
            <p>
              Once you are at the lake, our{' '}
              <Link href="/tahoe-transportation" className="text-blue-700 underline">
                Transit Guide
              </Link>{' '}
              lists the free TART and Lake Link buses, resort shuttles and airport shuttles that can
              cover the last few miles when a carpool only gets you partway.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-blue-600 rounded-lg shadow-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Know where you are going? Find your ride.</h2>
          <p className="text-blue-100 mb-6">
            Browse upcoming carpools or post your own. Free, nonprofit-run, neighbors only.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/rides/find"
              className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Find a Ride
            </Link>
            <Link
              href="/rides/post"
              className="bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors border border-blue-400"
            >
              Post a Ride
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-700 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
