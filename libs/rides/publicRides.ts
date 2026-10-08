import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { sanitizeLocation } from '@/libs/sanitize/location';
import { tahoeDate } from '@/lib/dateFormat';

/**
 * A ride post as shown to visitors who are not signed in.
 *
 * Only trip facts are exposed. Poster identity is reduced to a first name and
 * last initial, and anything that could carry a street address (exact pickup
 * text, special instructions, free-form description) is left out. Signing in
 * is required to see profiles or to message anyone.
 */
export interface PublicRide {
  id: string;
  postingType: 'driver' | 'passenger' | 'flexible';
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  isRoundTrip: boolean;
  returnDate: string | null;
  seatsAvailable: number | null;
  pricePerSeat: number | null;
  carType: string | null;
  hasAwd: boolean;
  posterLabel: string;
}

type RideRow = Pick<
  Database['public']['Tables']['rides']['Row'],
  | 'id'
  | 'poster_id'
  | 'posting_type'
  | 'start_location'
  | 'end_location'
  | 'departure_date'
  | 'departure_time'
  | 'is_round_trip'
  | 'return_date'
  | 'available_seats'
  | 'total_seats'
  | 'price_per_seat'
  | 'car_type'
  | 'has_awd'
>;

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'first_name' | 'last_name'
>;

const PUBLIC_RIDE_COLUMNS =
  'id, poster_id, posting_type, start_location, end_location, departure_date, departure_time, is_round_trip, return_date, available_seats, total_seats, price_per_seat, car_type, has_awd';

/**
 * Public place names a visitor may see, most specific first within each group.
 *
 * Ride locations are free text, so the public page never shows them directly.
 * It shows a canonical name only when the text names a known resort, region or
 * town as a whole word. Anything unrecognized (a street, a landmark, "my place")
 * falls back to a sign-in prompt, so a street address can never leak.
 */
const RESORTS: ReadonlyArray<readonly [canonical: string, aliases: readonly string[]]> = [
  ['Palisades Tahoe', ['Palisades Tahoe', 'Palisades', 'Squaw Valley', 'Alpine Meadows']],
  ['Northstar', ['Northstar California', 'Northstar']],
  ['Heavenly', ['Heavenly Mountain Resort', 'Heavenly']],
  ['Kirkwood', ['Kirkwood Mountain Resort', 'Kirkwood']],
  ['Sugar Bowl', ['Sugar Bowl']],
  ['Sierra-at-Tahoe', ['Sierra-at-Tahoe', 'Sierra at Tahoe']],
  ['Mt. Rose', ['Mt. Rose', 'Mt Rose', 'Mount Rose']],
  ['Diamond Peak', ['Diamond Peak']],
  ['Homewood', ['Homewood Mountain Resort', 'Homewood']],
  ['Boreal', ['Boreal Mountain', 'Boreal']],
  ['Donner Ski Ranch', ['Donner Ski Ranch']],
  ['Tahoe Donner', ['Tahoe Donner']],
  ['Soda Springs', ['Soda Springs']],
];

const REGIONS: ReadonlyArray<readonly [canonical: string, aliases: readonly string[]]> = [
  ['South Lake Tahoe', ['South Lake Tahoe', 'South Lake', 'S Lake Tahoe', 'SLT']],
  ['North Lake Tahoe', ['North Lake Tahoe', 'North Lake']],
  ['Reno-Tahoe Airport', ['Reno-Tahoe International Airport', 'Reno Tahoe Airport', 'RNO']],
  ['SFO', ['San Francisco International Airport', 'SFO']],
  ['San Jose Airport', ['San Jose International Airport', 'SJC']],
  ['Sacramento Airport', ['Sacramento International Airport', 'SMF']],
];

const TOWNS: readonly string[] = [
  // Tahoe basin and Sierra
  'Truckee',
  'Tahoe City',
  'Tahoe Vista',
  'Kings Beach',
  'Carnelian Bay',
  'Tahoma',
  'Meyers',
  'Olympic Valley',
  'Incline Village',
  'Crystal Bay',
  'Stateline',
  'Zephyr Cove',
  'Glenbrook',
  'Minden',
  'Gardnerville',
  'Carson City',
  'Reno',
  'Sparks',
  'Markleeville',
  'Pollock Pines',
  // Sacramento and foothills
  'West Sacramento',
  'Sacramento',
  'Davis',
  'Woodland',
  'Elk Grove',
  'Roseville',
  'Rocklin',
  'Lincoln',
  'Folsom',
  'El Dorado Hills',
  'Cameron Park',
  'Placerville',
  'Auburn',
  'Grass Valley',
  'Nevada City',
  'Citrus Heights',
  'Rancho Cordova',
  // Bay Area
  'South San Francisco',
  'San Francisco',
  'Oakland',
  'Berkeley',
  'Alameda',
  'Emeryville',
  'Richmond',
  'El Cerrito',
  'Albany',
  'San Leandro',
  'Hayward',
  'Fremont',
  'Union City',
  'Newark',
  'Castro Valley',
  'Dublin',
  'Pleasanton',
  'Livermore',
  'San Ramon',
  'Danville',
  'Walnut Creek',
  'Lafayette',
  'Orinda',
  'Moraga',
  'Concord',
  'Pleasant Hill',
  'Martinez',
  'Antioch',
  'Pittsburg',
  'Vallejo',
  'Benicia',
  'Napa',
  'Sonoma',
  'Santa Rosa',
  'Petaluma',
  'Novato',
  'San Rafael',
  'Mill Valley',
  'Sausalito',
  'Daly City',
  'San Bruno',
  'Millbrae',
  'Burlingame',
  'San Mateo',
  'Foster City',
  'Belmont',
  'San Carlos',
  'Redwood City',
  'Menlo Park',
  'East Palo Alto',
  'Palo Alto',
  'Mountain View',
  'Los Altos',
  'Sunnyvale',
  'Santa Clara',
  'Cupertino',
  'San Jose',
  'Campbell',
  'Saratoga',
  'Los Gatos',
  'Milpitas',
  'Morgan Hill',
  'Gilroy',
  'Half Moon Bay',
  'Pacifica',
  'Santa Cruz',
];

/** The broad fallback when the text names the lake but nothing more specific. */
const LAKE_TAHOE: readonly [string, readonly string[]] = ['Lake Tahoe', ['Lake Tahoe', 'Tahoe']];

/** A place name followed by one of these is a street ("Oakland Avenue"), not a place. */
const STREET_SUFFIX =
  /^\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|way|ln|lane|ct|court|pl|place|pkwy|parkway|hwy|highway|ter|terrace|cir|circle)\b/i;

const PUBLIC_PLACE_HIDDEN = 'Location shared after sign-in';

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether `alias` appears in `text` as a whole word that is not part of a street name. */
function namesPlace(text: string, alias: string): boolean {
  const pattern = new RegExp(`(?<![A-Za-z])${escapeForRegExp(alias)}(?![A-Za-z])`, 'gi');
  for (const match of text.matchAll(pattern)) {
    const rest = text.slice(match.index + match[0].length);
    if (!STREET_SUFFIX.test(rest)) return true;
  }
  return false;
}

/** Longest aliases first, so "South Lake Tahoe" wins over "Tahoe". */
const PLACE_GROUPS: ReadonlyArray<ReadonlyArray<readonly [string, string]>> = [
  RESORTS,
  REGIONS,
  TOWNS.map((town) => [town, [town]] as const),
  [LAKE_TAHOE],
].map((group) =>
  group
    .flatMap(([canonical, aliases]) => aliases.map((alias) => [canonical, alias] as const))
    .sort((a, b) => b[1].length - a[1].length)
);

/**
 * The public label for a free-text ride location: a known resort first, then a
 * region or airport, then a town, then "Lake Tahoe". Unknown text is hidden.
 */
export function toPublicPlace(location: string): string {
  const text = sanitizeLocation(location);
  for (const group of PLACE_GROUPS) {
    const found = group.find(([, alias]) => namesPlace(text, alias));
    if (found) return found[0];
  }
  return PUBLIC_PLACE_HIDDEN;
}

/** "Kaia Colban" becomes "Kaia C."; a missing name becomes "Community member". */
export function toPosterLabel(profile: ProfileRow | undefined): string {
  const first = profile?.first_name?.trim();
  if (!first) return 'Community member';
  const lastInitial = profile?.last_name?.trim().charAt(0);
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first;
}

function toPostingType(value: string): PublicRide['postingType'] {
  if (value === 'driver' || value === 'passenger') return value;
  return 'flexible';
}

export function toPublicRide(ride: RideRow, profile: ProfileRow | undefined): PublicRide {
  return {
    id: ride.id,
    postingType: toPostingType(ride.posting_type),
    from: toPublicPlace(ride.start_location),
    to: toPublicPlace(ride.end_location),
    departureDate: ride.departure_date,
    departureTime: ride.departure_time,
    isRoundTrip: ride.is_round_trip === true,
    returnDate: ride.return_date,
    seatsAvailable: ride.available_seats ?? ride.total_seats,
    pricePerSeat: ride.price_per_seat,
    carType: ride.car_type,
    hasAwd: ride.has_awd === true,
    posterLabel: toPosterLabel(profile),
  };
}

/** ISO date strings for the inclusive window of past trips to show. */
export function recentTripWindow(today: Date, days: number): { from: string; to: string } {
  const to = new Date(`${tahoeDate(today)}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() - 1);
  const from = new Date(`${tahoeDate(today)}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

/**
 * Upcoming active ride posts for the public Find a Ride directory.
 * Called by the server-only public projection with an elevated client after
 * anonymous access to member base tables has been revoked.
 */
export async function fetchPublicUpcomingRides(
  supabase: SupabaseClient<Database>,
  limit = 60
): Promise<PublicRide[]> {
  const today = tahoeDate();
  const { data: rides, error } = await supabase
    .from('rides')
    .select(PUBLIC_RIDE_COLUMNS)
    .eq('status', 'active')
    .gte('departure_date', today)
    .order('departure_date', { ascending: true })
    .order('departure_time', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!rides || rides.length === 0) return [];

  const posterIds = Array.from(new Set(rides.map((ride) => ride.poster_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, deleted_at')
    .in('id', posterIds);

  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rides
    .filter((ride) => !profilesById.get(ride.poster_id)?.deleted_at)
    .map((ride) => toPublicRide(ride, profilesById.get(ride.poster_id)));
}

/**
 * Recently completed trips, shown on the public directory when the season is
 * quiet so visitors can see what rides on the site look like.
 *
 * Completed rides are not readable under the anonymous row-level policy, so
 * this takes the server-side admin client. Only the public columns are read
 * and only the reduced `PublicRide` shape leaves this function.
 */
export async function fetchPublicRecentRides(
  supabase: SupabaseClient<Database>,
  options: { limit?: number; days?: number } = {}
): Promise<PublicRide[]> {
  const { limit = 12, days = 365 } = options;
  const { from, to } = recentTripWindow(new Date(), days);
  const { data: rides, error } = await supabase
    .from('rides')
    .select(PUBLIC_RIDE_COLUMNS)
    .in('status', ['active', 'completed'])
    .gte('departure_date', from)
    .lte('departure_date', to)
    .order('departure_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!rides || rides.length === 0) return [];

  const posterIds = Array.from(new Set(rides.map((ride) => ride.poster_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, deleted_at')
    .in('id', posterIds);

  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rides
    .filter((ride) => !profilesById.get(ride.poster_id)?.deleted_at)
    .map((ride) => toPublicRide(ride, profilesById.get(ride.poster_id)));
}
