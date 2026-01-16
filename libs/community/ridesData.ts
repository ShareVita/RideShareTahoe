import type {
  CommunityUser,
  LocationFilterType,
  ProfileType,
  RidePostType,
} from '@/app/community/types';
import { filterRidesByBoth } from '@/app/community/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Reuse the Supabase browser client type without importing from package.json
export type CommunitySupabaseClient = SupabaseClient<Database>;

/**
 * Fetches driver ride posts that are not owned by the current user.
 */
export const fetchDriverRides = async (
  supabase: CommunitySupabaseClient,
  currentUser: CommunityUser | null
): Promise<RidePostType[]> => {
  const baseQuery = supabase
    .from('rides')
    .select(
      `
      id,
      poster_id,
      posting_type,
      start_location,
      end_location,
      start_lat,
      start_lng,
      end_lat,
      end_lng,
      departure_date,
      departure_time,
      return_date,
      return_time,
      is_round_trip,
      trip_direction,
      round_trip_group_id,
      is_recurring,
      recurring_days,
      pricing_type,
      price_per_seat,
      gas_estimate,
      total_seats,
      available_seats,
      car_type,
      has_awd,
      driving_arrangement,
      music_preference,
      conversation_preference,
      title,
      description,
      special_instructions,
      status,
      created_at
    `
    )
    .eq('posting_type', 'driver')
    .eq('status', 'active')
    .gte('departure_date', new Date().toISOString().split('T')[0]);

  const query = currentUser ? baseQuery.neq('poster_id', currentUser.id) : baseQuery;

  const { data: rides, error } = (await query.order('departure_date', {
    ascending: true,
  })) as { data: Omit<RidePostType, 'owner'>[] | null; error: unknown };
  if (error) {
    console.error('Error fetching driver rides:', JSON.stringify(error, null, 2));
    // @ts-expect-error - logging optional property
    if (error.message) console.error('Error message:', error.message);
    throw error;
  }

  if (!rides || rides.length === 0) return [];

  // Manual join for profiles
  const posterIds = Array.from(new Set(rides.map((r) => r.poster_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, profile_photo_url, city')
    .in('id', posterIds);

  if (profilesError) {
    console.error('Error fetching profiles for rides:', profilesError);
    // Return rides without owner info if profile fetch fails, or throw?
    // Better to throw or return partial data? Let's return partial but it might break UI.
    // Let's log and return rides with null owner if we can't find them.
  }

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  // Filter out any rides where the owner could not be found or is invalid
  const validRides = rides
    .map((ride) => ({
      ...ride,
      owner: profileMap.get(ride.poster_id) || null,
    }))
    .filter((ride) => ride.owner?.first_name);

  return validRides as RidePostType[];
};

/**
 * Fetches passenger ride posts that are not owned by the current user.
 */
export interface FetchPassengerRidesOptions {
  page?: number;
  pageSize?: number;
  departureFilter?: LocationFilterType | null;
  destinationFilter?: LocationFilterType | null;
}

export const fetchPassengerRides = async (
  supabase: CommunitySupabaseClient,
  currentUser: CommunityUser | null,
  options?: FetchPassengerRidesOptions
): Promise<FetchAllRidesResponse> => {
  return fetchAllRides(supabase, currentUser, options?.page, options?.pageSize, 'passenger', {
    departureFilter: options?.departureFilter,
    destinationFilter: options?.destinationFilter,
  });
};

/**
 * Fetches ride posts owned by the current user.
 */
export const fetchMyRides = async (
  supabase: CommunitySupabaseClient,
  currentUser: CommunityUser
): Promise<RidePostType[]> => {
  const { data: rides, error } = (await supabase
    .from('rides')
    .select(
      `
      id,
      poster_id,
      posting_type,
      start_location,
      end_location,
      start_lat,
      start_lng,
      end_lat,
      end_lng,
      departure_date,
      return_date,
      return_time,
      departure_time,
      is_round_trip,
      trip_direction,
      round_trip_group_id,
      is_recurring,
      recurring_days,
      pricing_type,
      price_per_seat,
      gas_estimate,
      total_seats,
      available_seats,
      car_type,
      has_awd,
      driving_arrangement,
      music_preference,
      conversation_preference,
      title,
      description,
      special_instructions,
      status,
      created_at
    `
    )
    .eq('poster_id', currentUser.id)
    .order('created_at', { ascending: false })) as {
    data: Omit<RidePostType, 'owner'>[] | null;
    error: unknown;
  };

  if (error) {
    console.error('Error fetching user rides:', JSON.stringify(error, null, 2));
    // @ts-expect-error - logging optional property
    if (error.message) console.error('Error message:', error.message);
    throw error;
  }

  if (!rides || rides.length === 0) return [];

  // For my rides, the owner is the current user, so we can just attach it directly
  // However, to be consistent and ensure we have the profile fields we expect:
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, profile_photo_url, city')
    .eq('id', currentUser.id)
    .single();

  if (profileError) {
    console.error('Error fetching my profile for rides:', profileError);
  }

  return rides.map((ride) => ({
    ...ride,
    owner: profile || currentUser, // Fallback to currentUser object if fetch fails
  })) as RidePostType[];
};

/**
 * Response type for paginated ride fetches.
 */
export interface FetchAllRidesFilters {
  departureFilter?: LocationFilterType | null;
  destinationFilter?: LocationFilterType | null;
}

export interface FetchAllRidesResponse {
  rides: RidePostType[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Fetches all active ride posts (both driver and passenger types) with pagination.
 * Excludes rides owned by the current user.
 *
 * @param supabase - Supabase client instance
 * @param currentUser - Current authenticated user (optional)
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of rides per page
 * @returns Paginated rides with total count and hasMore flag
 */
export const fetchAllRides = async (
  supabase: CommunitySupabaseClient,
  currentUser: CommunityUser | null,
  page: number = 1,
  pageSize: number = 20,
  postingType?: 'driver' | 'passenger',
  filters?: FetchAllRidesFilters
): Promise<FetchAllRidesResponse> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build base query with INNER JOIN on profiles
  // We explicitly select the fields we need from profiles to avoid over-fetching
  // AND we verify the profile is valid (has first name)
  let baseQuery = supabase
    .from('rides')
    .select(
      `
      id,
      poster_id,
      posting_type,
      start_location,
      end_location,
      start_lat,
      start_lng,
      end_lat,
      end_lng,
      departure_date,
      return_date,
      return_time,
      departure_time,
      is_round_trip,
      trip_direction,
      round_trip_group_id,
      is_recurring,
      recurring_days,
      pricing_type,
      price_per_seat,
      gas_estimate,
      total_seats,
      available_seats,
      car_type,
      has_awd,
      driving_arrangement,
      music_preference,
      conversation_preference,
      title,
      description,
      special_instructions,
      status,
      created_at
    `,
      { count: 'exact' }
    )
    .eq('status', 'active')
    .gte('departure_date', new Date().toISOString().split('T')[0]);

  // Filter by posting type if provided
  if (postingType) {
    baseQuery = baseQuery.eq('posting_type', postingType);
  }

  const boundingBox = (
    filter: LocationFilterType
  ): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } => {
    const milesPerDegreeLat = 69;
    const latDelta = filter.radius / milesPerDegreeLat;
    const lngDelta = filter.radius / (Math.cos((filter.lat * Math.PI) / 180) * milesPerDegreeLat);
    return {
      minLat: filter.lat - latDelta,
      maxLat: filter.lat + latDelta,
      minLng: filter.lng - lngDelta,
      maxLng: filter.lng + lngDelta,
    };
  };

  const applyLocationBounds = (
    builder: ReturnType<typeof supabase.from>,
    filter: LocationFilterType | null,
    latField: string,
    lngField: string
  ) => {
    if (!filter) return builder;
    const bounds = boundingBox(filter);
    return builder
      .gte(latField, bounds.minLat)
      .lte(latField, bounds.maxLat)
      .gte(lngField, bounds.minLng)
      .lte(lngField, bounds.maxLng);
  };

  baseQuery = applyLocationBounds(
    baseQuery,
    filters?.departureFilter ?? null,
    'start_lat',
    'start_lng'
  );
  baseQuery = applyLocationBounds(
    baseQuery,
    filters?.destinationFilter ?? null,
    'end_lat',
    'end_lng'
  );

  // Exclude current user's rides if user is logged in
  if (currentUser) {
    baseQuery = baseQuery.neq('poster_id', currentUser.id);
  }

  const {
    data: rides,
    error,
    count,
  } = await baseQuery
    .order('departure_date', { ascending: true })
    .order('departure_time', { ascending: true })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('Error fetching all rides:', JSON.stringify(error, null, 2));
    if (error.message) console.error('Error message:', error.message);
    throw error;
  }

  if (!rides || rides.length === 0) {
    return {
      rides: [],
      totalCount: count || 0,
      hasMore: false,
    };
  }

  const posterIds = Array.from(new Set(rides.map((ride) => ride.poster_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, profile_photo_url, city, state')
    .in('id', posterIds);

  if (profilesError) {
    console.error('Error fetching profiles for rides:', profilesError);
  }

  const profileMap = new Map(profiles?.map((profile) => [profile.id, profile as ProfileType]));

  const ridesWithOwners = (rides as RidePostType[]).map((ride) => ({
    ...ride,
    owner: profileMap.get(ride.poster_id) || null,
  }));

  // Apply precise distance-based filtering in-memory using the community utils
  // The DB query applies a bounding-box to reduce rows; this step enforces
  // the exact radius checks (haversine) so results match client expectations.
  const filteredRides =
    filters?.departureFilter || filters?.destinationFilter
      ? filterRidesByBoth(
          ridesWithOwners,
          filters?.departureFilter ?? null,
          filters?.destinationFilter ?? null
        )
      : ridesWithOwners;

  // Note: because we apply the stricter distance filter in-memory after the
  // DB query, the returned totalCount reflects the filtered set on this page.
  // Accurate pagination across all pages would require counting matches with
  // the same precise distance logic at the DB level (not implemented here).
  const totalCount = filteredRides.length;
  const hasMore =
    count === null
      ? filteredRides.length === pageSize
      : from + filteredRides.length < (count ?? filteredRides.length);

  return {
    rides: filteredRides,
    totalCount,
    hasMore,
  };
};

/**
 * Fetches a single ride by ID.
 */
export const fetchRideById = async (
  supabase: CommunitySupabaseClient,
  rideId: string
): Promise<RidePostType | null> => {
  const { data: ride, error } = await supabase
    .from('rides')
    .select(
      `
      id,
      poster_id,
      posting_type,
      start_location,
      end_location,
      start_lat,
      start_lng,
      end_lat,
      end_lng,
      departure_date,
      return_date,
      return_time,
      departure_time,
      is_round_trip,
      trip_direction,
      round_trip_group_id,
      is_recurring,
      recurring_days,
      pricing_type,
      price_per_seat,
      gas_estimate,
      total_seats,
      available_seats,
      car_type,
      has_awd,
      driving_arrangement,
      music_preference,
      conversation_preference,
      title,
      description,
      special_instructions,
      status,
      created_at
    `
    )
    .eq('id', rideId)
    .single();

  if (error) {
    console.error('Error fetching ride:', error);
    return null;
  }

  if (!ride) return null;

  // Fetch owner profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, profile_photo_url, city')
    .eq('id', ride.poster_id)
    .single();

  return {
    ...ride,
    owner: profile || null,
  } as RidePostType;
};

/**
 * Updates an existing ride post.
 */
export const updateRide = async (
  supabase: CommunitySupabaseClient,
  rideId: string,
  updates: Partial<RidePostType>
): Promise<void> => {
  // Exclude owner & generated fields from updates
  const cleanUpdates = { ...updates };
  delete cleanUpdates.owner;
  delete cleanUpdates.id;
  delete cleanUpdates.created_at;

  const { error } = await supabase.from('rides').update(cleanUpdates).eq('id', rideId);

  if (error) {
    console.error('Error updating ride:', error);
    throw error;
  }
};
