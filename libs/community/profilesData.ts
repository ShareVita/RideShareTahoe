import type { createClient } from '@/lib/supabase/client';
import type { ProfileType } from '@/app/community/types';

export type CommunitySupabaseClient = ReturnType<typeof createClient>;

/**
 * Response from fetchProfiles including pagination metadata.
 */
export interface FetchProfilesResponse {
  profiles: ProfileType[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface ProfileSocialsRow {
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  airbnb_url?: string | null;
  other_social_url?: string | null;
}

interface ProfilesQueryRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;

  pronouns: string | null;
  profile_socials: ProfileSocialsRow | null;
}

/**
 * Fetches profiles with pagination.
 *
 * @param supabase - Supabase client instance
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of profiles per page
 * @returns Promise with profiles array and pagination metadata
 */
export const fetchProfiles = async (
  supabase: CommunitySupabaseClient,
  page: number = 1,
  pageSize: number = 20
): Promise<FetchProfilesResponse> => {
  const offset = (page - 1) * pageSize;

  // Build the query for count
  const countQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('first_name', '')
    .not('first_name', 'is', null)
    .neq('last_name', '')
    .not('last_name', 'is', null)
    .neq('city', '')
    .not('city', 'is', null);

  const { count: totalCount, error: countError } = await countQuery;

  if (countError) {
    console.error('Error fetching profile count:', countError);
    throw countError;
  }

  // Build the query for data
  const dataQuery = supabase
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

      pronouns,
      profile_socials (
        facebook_url,
        instagram_url,
        linkedin_url,
        airbnb_url,
        other_social_url
      )
    `
    )
    .neq('first_name', '')
    .not('first_name', 'is', null)
    .neq('last_name', '')
    .not('last_name', 'is', null)
    .neq('city', '')
    .not('city', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data: profiles, error } = await dataQuery;

  if (error) {
    console.error('Error fetching profiles:', JSON.stringify(error, null, 2));
    throw error;
  }

  const hasMore = totalCount ? offset + pageSize < totalCount : false;

  const profileRows = (profiles || []) as ProfilesQueryRow[];

  // Map the profiles to flatten the social URLs
  const formattedProfiles: ProfileType[] = profileRows.map((profile) => ({
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    profile_photo_url: profile.profile_photo_url,
    city: profile.city,
    state: profile.state,
    bio: profile.bio,

    pronouns: profile.pronouns || null,
    // Flatten social URLs
    facebook_url: profile.profile_socials?.facebook_url || null,
    instagram_url: profile.profile_socials?.instagram_url || null,
    linkedin_url: profile.profile_socials?.linkedin_url || null,
    airbnb_url: profile.profile_socials?.airbnb_url || null,
    other_social_url: profile.profile_socials?.other_social_url || null,
    // Default other fields that might be missing
    community_support_badge: null,
    support_preferences: null,
    support_story: null,
    other_support_description: null,
    car_details: null,
  }));

  return {
    profiles: formattedProfiles,
    totalCount: totalCount || 0,
    page,
    pageSize,
    hasMore,
  };
};
