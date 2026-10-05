import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';

export const metadata = getSEOTags({
  title: 'Tahoe Ski Resorts & Carpool Routes Guide | RideShareTahoe',
  description:
    'Every Lake Tahoe ski resort with drive times from San Francisco, Oakland, Sacramento and Reno, which pass gets you in, 2025-26 parking rules and carpool discounts, chain control basics, and the pickup spots carpoolers use.',
  canonicalUrlRelative: '/tahoe-resorts',
  keywords: [
    'tahoe ski resorts',
    'drive to tahoe from san francisco',
    'sacramento to tahoe drive',
    'reno to tahoe ski resorts',
    'i-80 chain control',
    'us-50 tahoe',
    'palisades tahoe carpool parking',
    'northstar carpool parking',
    'kirkwood carpool parking',
    'heavenly parking',
    'sugar bowl carpool',
    'mt rose carpool',
    'tahoe carpool pickup spots',
  ],
  openGraph: {
    title: 'Tahoe Ski Resorts & Carpool Routes Guide',
    description:
      'Drive times, routes, parking rules, chain controls and pickup spots for carpooling to every Tahoe resort.',
  },
});

interface Resort {
  name: string;
  where: string;
  getThere: string;
  driveTimes: string;
  pass: string;
  parking: string;
  why: string;
}

const RESORTS: Resort[] = [
  {
    name: 'Palisades Tahoe',
    where:
      'Olympic Valley and Alpine Meadows, west shore, off CA-89 between Truckee and Tahoe City',
    getThere:
      'I-80 to Truckee, then CA-89 south about 10 miles. Two base areas joined by a gondola.',
    driveTimes: 'San Francisco about 3 h 30 (197 mi) · Oakland 3 h 15 · Sacramento 2 h · Reno 1 h',
    pass: 'Ikon Pass',
    parking:
      'Reservations are required in every lot on Saturdays, Sundays and holidays. Cars with four or more people can book a Carpool 4+ reservation, and the driver gets a $20 resort voucher at check-in. Reservations open online each Tuesday at noon for the coming weekend.',
    why: 'The single best reason to fill a car: a reservation, a voucher, and no circling the lot.',
  },
  {
    name: 'Northstar California',
    where: 'Between Truckee and Kings Beach on CA-267',
    getThere: 'I-80 to Truckee, then CA-267 south about 6 miles.',
    driveTimes:
      'San Francisco about 3 h 30 · Oakland 3 h 20 (190 mi) · Sacramento 1 h 50 · Reno 50 min',
    pass: 'Epic Pass',
    parking:
      'The Village View lots need a reservation on weekends and peak days from 7 am to 1 pm: free with four or more in the car, $20 with three or fewer. The Castle Peak lots are free every day with a shuttle, and the paid Preferred lot is $25 on weekdays and $50 on weekends.',
    why: 'Closest big resort to I-80 after the Donner Summit hills, and a carpool parks free.',
  },
  {
    name: 'Heavenly Mountain Resort',
    where: 'South Lake Tahoe and Stateline, on the California and Nevada line',
    getThere:
      'US-50 from Sacramento over Echo Summit. From the Bay, either I-80 then US-50 at Sacramento, or I-80 to Truckee then CA-89 down the west shore when 50 is backed up.',
    driveTimes:
      'Sacramento about 2 h (103 mi) · San Francisco 3 h 45 · Oakland 3 h 30 · Reno 1 h 15',
    pass: 'Epic Pass',
    parking:
      'California Lodge is free all week with a shuttle to the gondola in Heavenly Village. The California Base lot needs a reservation and charges cars with three or fewer people before 11:30 am on weekends and peak days, then goes free after 11:30. Stagecoach Lodge is free but small.',
    why: 'Carpools can drop riders in the village for the gondola and skip resort parking entirely.',
  },
  {
    name: 'Kirkwood Mountain Resort',
    where: 'On CA-88 at Carson Pass, about 35 miles south of South Lake Tahoe',
    getThere:
      'US-50 to Meyers, CA-89 south, then CA-88 west. From the East Bay, CA-88 the whole way through Jackson is the same time with less traffic.',
    driveTimes: 'Sacramento about 2 h · San Francisco 3 h 45 · Oakland 3 h 30 · Reno 1 h 45',
    pass: 'Epic Pass',
    parking:
      'Reservations are required in all lots on weekends and peak days until noon. Lower 7, Kirkwood Meadows Drive and the Kirkwood Inn lots are free with a reservation. The paid lots are $20 for three or fewer people and free for four or more, still with a reservation.',
    why: 'Highest, snowiest, most chain controls, longest solo drive. Exactly the trip you want company for.',
  },
  {
    name: 'Sugar Bowl',
    where: 'Donner Summit on old US-40, right off I-80 at the Soda Springs and Norden exits',
    getThere: 'I-80 straight to the exit. No lake roads, no CA-89.',
    driveTimes: 'San Francisco about 3 h 15 · Oakland 3 h · Sacramento 1 h 30 · Reno 50 min',
    pass: 'Own season pass; two days each on the Mountain Collective',
    parking:
      'Two lots: the Village gondola garage and the Judah base. Both fill on storm weekends. Sugar Bowl sells a preferred parking add-on to passholders, and a new Village gondola is planned for the 2026-27 season.',
    why: 'The first real resort you reach from the Bay, which saves 30 to 45 minutes over the lake.',
  },
  {
    name: 'Mt. Rose Ski Tahoe',
    where: 'Between Reno and Incline Village on NV-431, the Mt. Rose Highway',
    getThere:
      'From Reno, NV-431 south about 25 miles. From the lake, NV-431 north from Incline Village.',
    driveTimes:
      'Reno about 35 min (24 mi) · Sacramento 2 h 30 · Oakland 3 h 45 · San Francisco 4 h',
    pass: 'Own season pass, independent',
    parking:
      'Free lots at both the Main and Slide bases. No lodging at the base, so nearly everyone day-trips.',
    why: 'Highest base in Tahoe at about 8,260 feet, so the snow holds when lake-level resorts go soft. The Reno carpool default.',
  },
  {
    name: 'Boreal Mountain',
    where: 'Donner Summit, directly off I-80 at the Boreal and Castle Peak exit',
    getThere: 'I-80, exit, you are in the lot.',
    driveTimes: 'San Francisco about 3 h · Oakland 2 h 50 · Sacramento 1 h 25 · Reno 55 min',
    pass: 'Own season pass (POWDR)',
    parking: 'Free lots at the base.',
    why: 'Night skiing until 8 pm, the only resort at Tahoe with it, which makes an after-work Friday carpool realistic.',
  },
  {
    name: 'Sierra-at-Tahoe',
    where: 'On US-50 at Echo Summit, 12 miles west of South Lake Tahoe',
    getThere: 'US-50 from Sacramento. You arrive before you reach the lake.',
    driveTimes: 'Sacramento about 1 h 45 · San Francisco 3 h 30 · Oakland 3 h 15 · Reno 1 h 30',
    pass: 'Ikon Pass',
    parking:
      'Five free first-come lots. The only paid spot is a preferred zone at the top of Lot C for $35. A free South Shore shuttle runs from the Stateline transit center once or twice a day.',
    why: 'Skip South Lake traffic entirely, and the only Ikon resort on the south side.',
  },
  {
    name: 'Homewood Mountain Resort',
    where: 'West shore on CA-89, 6 miles south of Tahoe City',
    getThere: 'I-80 to Truckee, then CA-89 south through Tahoe City.',
    driveTimes: 'San Francisco about 4 h · Oakland 3 h 45 · Sacramento 2 h 15 · Reno 1 h 10',
    pass: 'Own season pass and day tickets',
    parking: 'Small lots right on the highway, so early arrival matters.',
    why: 'Reopened in December 2025 after a season closed, and stays open to the public alongside new memberships. The lake views from the chairs are the whole point.',
  },
  {
    name: 'Diamond Peak',
    where: 'Incline Village, Nevada, on the northeast shore',
    getThere:
      'From Reno, NV-431 over Mt. Rose Summit. From Truckee, CA-267 to Kings Beach then NV-28.',
    driveTimes: 'Reno about 45 min · Sacramento 2 h 20 · Oakland 3 h 45 · San Francisco 4 h',
    pass: 'Own season pass with bonus days at about 50 partner hills',
    parking: 'Free, with an optional paid slope-side lot on weekends.',
    why: 'Community-owned by the Incline Village district, quiet on powder days when the big names are mobbed.',
  },
  {
    name: 'Tahoe Donner, Donner Ski Ranch and Soda Springs',
    where: 'Truckee and Donner Summit',
    getThere: 'I-80 to the Donner Pass Road exits.',
    driveTimes: 'San Francisco about 3 h to 3 h 15 · Sacramento 1 h 30 · Reno 45 min to 1 h',
    pass: 'Tahoe Donner and Soda Springs sell their own passes. Donner Ski Ranch joined the Indy Pass for 2025-26.',
    parking: 'Free at all three.',
    why: 'The hills to learn on, bring kids to, or go tubing. Cheap tickets and the shortest drives from the Bay.',
  },
];

interface Origin {
  city: string;
  roads: string;
  spots: string;
  tip: string;
}

const ORIGINS: Origin[] = [
  {
    city: 'San Francisco',
    roads:
      'Bay Bridge to I-80 east. For the south shore, stay on I-80 to Sacramento and take US-50.',
    spots:
      'Sports Basement Presidio or Bryant Street, Civic Center and Embarcadero BART, the Safeway lot in the Marina.',
    tip: 'The Bay Bridge is $8.50 in 2026. Leaving before 5:30 am Saturday or after 8 pm Friday avoids the crawl through Vacaville. The Solano I-80 express lanes need three people in the car, 5 am to 8 pm every day, so a full carpool rides them legally.',
  },
  {
    city: 'Oakland, Berkeley and the East Bay',
    roads: 'I-80 east from the MacArthur Maze. No bridge toll heading east.',
    spots:
      'Rockridge BART, MacArthur BART, West Oakland BART, Emeryville Public Market, El Cerrito del Norte BART for Richmond pickups.',
    tip: 'Rockridge BART is the most common pickup spot on this site. Easy to describe, coffee next door, and it is right on the way to the freeway.',
  },
  {
    city: 'Sacramento',
    roads:
      'US-50 east for Heavenly, Sierra-at-Tahoe and Kirkwood. I-80 east for everything on the north shore and Donner Summit.',
    spots:
      'Roseville Galleria area for I-80 trips, Folsom or El Dorado Hills park and rides for US-50.',
    tip: 'Sacramento is the midpoint. Bay Area drivers often pick up a rider here on the way, so post even if you only need the last two hours.',
  },
  {
    city: 'Reno and Sparks',
    roads:
      'I-80 west to Truckee for the north shore. NV-431, the Mt. Rose Highway, for Mt. Rose, Diamond Peak and Incline. US-395 then US-50 for South Lake.',
    spots: 'Reno-Tahoe Airport cell phone lot, Meadowood Mall, the UNR campus, Sparks Galleria.',
    tip: 'Reno carpools are how people who fly in get to the lake. If you are posting an airport pickup, include the flight arrival time.',
  },
];

export default function TahoeResortsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Tahoe ski resorts and carpool routes, resort by resort
          </h1>
          <p className="text-gray-600 mb-3">
            Which highway, how long it really takes, what the parking rules are this season, and
            where carpools actually meet. We wrote this because the same questions come up in every
            ride chat on the site, and because several resorts now park a full car for free while
            charging a half-empty one.
          </p>
          <p className="text-gray-600">
            Drive times are dry-road estimates from each city center on a normal weekend morning.
            Add an hour on storm days and holiday weekends. Check{' '}
            <a
              href="https://quickmap.dot.ca.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              Caltrans QuickMap
            </a>{' '}
            for California roads and{' '}
            <a
              href="https://www.nvroads.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              Nevada 511
            </a>{' '}
            for the Mt. Rose Highway before you leave. Parking programs and pass partners change
            every season, so treat the resort&apos;s own site as the final word. Everything below
            was checked in October 2026.
          </p>
        </div>

        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="routes">
          <h2 id="routes" className="text-2xl font-bold text-gray-900 mb-4">
            Two highways. Pick by resort, not by road.
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Interstate 80</strong> crosses the Sierra at Donner Summit, about 7,240 feet,
              and is the way to Truckee and the north shore: Palisades, Northstar, Sugar Bowl,
              Boreal, Tahoe Donner and the small Donner Summit hills. It is a divided freeway the
              whole way, it gets plowed first, and it carries most of the weekend traffic, so it is
              both the easiest road and the one most likely to be a parking lot at Applegate on a
              Friday night.
            </p>
            <p>
              <strong>US Highway 50</strong> crosses at Echo Summit, about 7,380 feet, and is the
              way from Sacramento to the south shore: Heavenly, Sierra-at-Tahoe and the turnoff for
              Kirkwood. Long stretches east of Placerville are two lanes, so it closes more often in
              storms and backs up at the chain checks. From San Francisco the two routes take about
              the same time to the lake.
            </p>
            <p>
              <strong>From Reno</strong>, I-80 west reaches Truckee in about 35 minutes. The Mt.
              Rose Highway, NV-431, climbs past Mt. Rose and drops into Incline Village. US-395
              south then US-50 west gets you to South Lake in a little over an hour.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="chains">
          <h2 id="chains" className="text-2xl font-bold text-gray-900 mb-4">
            Chain controls, decoded
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              When it snows, Caltrans posts one of three requirement levels on the highway signs and
              on QuickMap. These are the official definitions, shortened:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>R1:</strong> chains required, except for passenger cars and light trucks
                with snow-rated tires on the drive wheels. Those cars must still carry chains.
              </li>
              <li>
                <strong>R2:</strong> chains required on everything except four-wheel or all-wheel
                drive with snow-rated tires on all four wheels. AWD cars must still carry chains.
                This is the common storm-day level, and the reason &ldquo;AWD with good tires&rdquo;
                is worth a lot in a ride post.
              </li>
              <li>
                <strong>R3:</strong> chains on every vehicle, no exceptions. Rare. The highway
                usually closes soon after.
              </li>
            </ul>
            <p>
              Notice the pattern: at R1 and R2, even the exempt cars have to have chains in the
              trunk. Licensed chain installers work the pull-outs on I-80 and US-50 and charge about
              $40 to put a set on. Practice in your driveway once so the first time is not on the
              shoulder at Kingvale in the dark.
            </p>
            <p>
              <strong>If you are the passenger:</strong> ask in the chat whether the driver has AWD
              or chains. It is a normal question and a quick answer is a good sign.
            </p>
          </div>
        </section>

        <section
          className="bg-white rounded-lg shadow-lg p-8 mb-6"
          aria-labelledby="carpool-parking"
        >
          <h2 id="carpool-parking" className="text-2xl font-bold text-gray-900 mb-4">
            The 2025-26 rule that makes carpooling pay for itself
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Four of the biggest resorts now price parking by how many people are in the car.
              Palisades requires a weekend reservation in every lot and gives Carpool 4+ cars their
              own reservation plus a $20 voucher. Northstar&apos;s Village View lots are free with
              four or more and $20 with three or fewer. Kirkwood&apos;s paid lots work the same way.
              Heavenly charges cars with three or fewer at the California Base lot before 11:30 am.
            </p>
            <p>
              In other words, a driver who posts three open seats on this site is not just covering
              gas. On a Saturday at Northstar or Kirkwood the car parks free instead of paying $20,
              and at Palisades it gets a guaranteed spot and lunch money. Say so in your post.
            </p>
          </div>
        </section>

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
                    <dd>{origin.roads}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Common meeting spots</dt>
                    <dd>{origin.spots}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Worth knowing</dt>
                    <dd>{origin.tip}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="resorts">
          <h2 id="resorts" className="text-2xl font-bold text-gray-900 mb-2">
            Resort by resort
          </h2>
          <p className="text-gray-600 mb-6">
            North shore first, then south, then around the lake. Parking details are the 2025-26
            season rules as published by each resort.
          </p>
          <div className="space-y-6">
            {RESORTS.map((resort) => (
              <article key={resort.name} className="border border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900">{resort.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{resort.where}</p>
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-700">
                  <div>
                    <dt className="font-medium text-gray-900">Getting there</dt>
                    <dd>{resort.getThere}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Drive time</dt>
                    <dd>{resort.driveTimes}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Pass</dt>
                    <dd>{resort.pass}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Parking this season</dt>
                    <dd>{resort.parking}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-gray-800">
                  <span className="font-medium">Why carpool here:</span> {resort.why}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="towns">
          <h2 id="towns" className="text-2xl font-bold text-gray-900 mb-4">
            Not skiing? Truckee, South Lake, the airport, and summer
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Plenty of posts are not about a resort at all. Someone needs to get to a rental in
              Truckee, a friend&apos;s place in Kings Beach, a job in South Lake, or back to the
              Reno airport on Sunday night. Post the town and the time and let the right driver find
              you. In summer the same roads carry hikers to Desolation Wilderness, climbers to
              Donner Summit, and everyone to Sand Harbor and Emerald Bay.
            </p>
            <p>
              Once you are at the lake, the{' '}
              <Link href="/tahoe-transportation" className="text-blue-700 underline">
                Transit Guide
              </Link>{' '}
              covers the free TART and Lake Link buses, resort shuttles and airport shuttles for the
              last few miles when a carpool only gets you partway.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-lg p-8 mb-6" aria-labelledby="sources">
          <h2 id="sources" className="text-xl font-bold text-gray-900 mb-3">
            Sources
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Checked October 2026. If a resort changes its rules mid-season, their page wins.
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li>
              <a
                href="https://dot.ca.gov/travel/winter-driving-tips/chain-controls"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Caltrans: chain controls and installation
              </a>
            </li>
            <li>
              <a
                href="https://www.palisadestahoe.com/mountain-information/parking-and-road-conditions/parking-program"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Palisades Tahoe parking program
              </a>
            </li>
            <li>
              <a
                href="https://www.northstarcalifornia.com/explore-the-resort/about-the-resort/getting-here.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Northstar California getting here and parking
              </a>
            </li>
            <li>
              <a
                href="https://www.skiheavenly.com/explore-the-resort/about-the-resort/getting-here-and-parking.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Heavenly getting here and parking
              </a>
            </li>
            <li>
              <a
                href="https://www.kirkwood.com/explore-the-resort/about-the-resort/parking.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Kirkwood parking
              </a>
            </li>
            <li>
              <a
                href="https://sierraattahoe.com/getting-here/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Sierra-at-Tahoe getting here
              </a>
            </li>
            <li>
              <a
                href="https://www.sugarbowl.com/directions"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Sugar Bowl directions and parking
              </a>
            </li>
            <li>
              <a
                href="https://www.diamondpeak.com/visit/getting-here-parking/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Diamond Peak getting here and parking
              </a>
            </li>
            <li>
              <a
                href="https://skirose.com/season-passes/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Mt. Rose season passes
              </a>
            </li>
            <li>
              <a
                href="https://www.bayareafastrak.org/en/cms/news-detail-article30.shtml"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Bay Area FasTrak: 2026 toll and carpool changes
              </a>
            </li>
            <li>
              <a
                href="https://511.org/travel/express-lanes/i-80-express-lanes"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                511.org: I-80 express lanes
              </a>
            </li>
          </ul>
        </section>

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
