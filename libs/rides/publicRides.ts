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
 * Only emit canonical city names, never arbitrary pickup/address segments.
 * Without structured city fields we cannot reliably distinguish a landmark,
 * street, apartment, or town. This intentionally incomplete regional allowlist
 * fails closed; unknown towns need sign-in rather than a risky text heuristic.
 */
export function toPublicPlace(location: string): string {
  const parts = sanitizeLocation(location)
    .split(',')
    .map((part) => part.trim().toLowerCase());
  const cities = [
    'San Francisco',
    'Oakland',
    'Berkeley',
    'San Jose',
    'Sacramento',
    'Davis',
    'Roseville',
    'Folsom',
    'Auburn',
    'Placerville',
    'Truckee',
    'South Lake Tahoe',
    'Tahoe City',
    'Tahoe Vista',
    'Kings Beach',
    'Carnelian Bay',
    'Olympic Valley',
    'Soda Springs',
    'Incline Village',
    'Stateline',
    'Reno',
    'Sparks',
    'Carson City',
  ];
  return (
    cities.find((city) => parts.includes(city.toLowerCase())) ?? 'Location shared after sign-in'
  );
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
    .select('id, first_name, last_name')
    .in('id', posterIds);

  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rides.map((ride) => toPublicRide(ride, profilesById.get(ride.poster_id)));
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
    .select('id, first_name, last_name')
    .in('id', posterIds);

  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rides.map((ride) => toPublicRide(ride, profilesById.get(ride.poster_id)));
}
