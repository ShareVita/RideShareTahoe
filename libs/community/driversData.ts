import type { createClient } from '@/lib/supabase/client';
import type { ProfileType } from '@/app/community/types';

export type CommunitySupabaseClient = ReturnType<typeof createClient>;

/**
 * Response from fetchDrivers including pagination metadata.
 */
export interface FetchDriversResponse {
  drivers: ProfileType[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Fetches driver profiles with pagination.
 *
 * @param supabase - Supabase client instance
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of drivers per page (default: 20)
 * @returns Promise with drivers array and pagination metadata
 *
 * @example
 * const { drivers, totalCount, hasMore } = await fetchDrivers(supabase, 1, 20);
 */
export const fetchDrivers = async (
  supabase: CommunitySupabaseClient,
  page: number = 1,
  pageSize: number = 20
): Promise<FetchDriversResponse> => {
  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // First, get the total count of drivers
  const { count: totalCount, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .or('role.eq.driver,role.eq.both')
    .neq('first_name', '')
    .not('first_name', 'is', null)
    .neq('last_name', '')
    .not('last_name', 'is', null)
    .or('bio.neq.,car_details.not.is.null'); // Require either a bio OR car details

  if (countError) {
    console.error('Error fetching driver count:', JSON.stringify(countError, null, 2));
    throw countError;
  }

  // Fetch the paginated drivers
  const { data: drivers, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      first_name,
      last_name,
      profile_photo_url,
      city,
      state,
      bio,
      role,
      car_details,
      facebook_url,
      instagram_url,
      linkedin_url,
      airbnb_url,
      other_social_url,
      community_support_badge,
      support_preferences,
      support_story,
      other_support_description
    `
    )
    .or('role.eq.driver,role.eq.both')
    .neq('first_name', '')
    .not('first_name', 'is', null)
    .neq('last_name', '')
    .not('last_name', 'is', null)
    .or('bio.neq.,car_details.not.is.null') // Require either a bio OR car details
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error fetching drivers:', JSON.stringify(error, null, 2));
    if ('message' in error) {
      console.error('Error message:', error.message);
    }
    throw error;
  }

  const hasMore = totalCount ? offset + pageSize < totalCount : false;

  return {
    drivers: (drivers as ProfileType[]) || [],
    totalCount: totalCount || 0,
    page,
    pageSize,
    hasMore,
  };
};
