import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { createClient } from '@/libs/supabase/client';

// #region Interfaces
/**
 * Interface for the 'profiles' database table data.
 */
export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  profile_photo_url: string | null;
  display_lat: number | null;
  display_lng: number | null;
  street_address: string | null;
  zip_code: string | null;
  is_admin?: boolean;
  is_banned?: boolean;
  pronouns?: string | null;
  // Add other profile fields here
  [key: string]: unknown;
}

/**
 * Interface for the 'dogs' database table data.
 */
export interface UserDog {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  birthday: string | null;
  age_years: number;
  age_months: number;
  size: string | null;
  photo_url: string | null;
  gender: string | null;
  neutered: boolean;
  temperament: string[] | null;
  energy_level: string | null;
  dog_friendly: boolean;
  cat_friendly: boolean;
  kid_friendly: boolean;
  leash_trained: boolean;
  crate_trained: boolean;
  house_trained: boolean;
  fully_vaccinated: boolean;
  activities: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Defines the allowed data structure for updating a user profile.
 * Excludes non-updatable fields like 'id' and 'email'.
 */
export type UpdatableProfileData = Partial<Omit<UserProfile, 'id' | 'email'>>;

/**
 * Represents a user consent record from the database.
 */
export interface UserConsent {
  id: string;
  user_id: string;
  document_type: 'tos' | 'privacy_policy' | 'community_guidelines';
  document_version: string;
  accepted_at: string;
}

// #endregion Interfaces

// #region Hooks

/**
 * Fetches the user's consent records to check if they've agreed to legal documents.
 *
 * @returns A query result containing the user's consent records.
 */
export const useUserConsents = () => {
  const { user } = useUser();
  const supabase = createClient();

  return useQuery<UserConsent[], Error>({
    queryKey: ['consents', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_consents')
        .select('id, user_id, document_type, document_version, accepted_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to fetch consents:', error);
        return [];
      }

      return (data as UserConsent[]) ?? [];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Fetches the signed-in user's profile from Supabase.
 *
 * @returns A query result containing the user's profile or null.
 * @throws {Error} When the Supabase query returns an error.
 */
export const useUserProfile = () => {
  const { user } = useUser();
  const supabase = createClient();

  return useQuery<UserProfile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch public profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message || 'Failed to fetch public profile');
      }

      if (!profile) return null;

      // Fetch private info
      const { data: privateInfo, error: privateError } = await supabase
        .from('user_private_info')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // If private info is missing (shouldn't happen with trigger), just continue?
      // Or maybe it does happen if migration was partial?
      if (privateError) {
        console.error('Failed to fetch private info', privateError);
      }

      // Fetch socials
      const { data: socials } = await supabase
        .from('profile_socials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Merge all data
      return {
        ...profile,
        ...privateInfo,
        ...socials,
      } as UserProfile;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Loads the list of dogs owned by the current user.
 *
 * @returns A query result containing the user's dogs array.
 * @throws {Error} When fetching the dogs list fails.
 */
export const useUserDogs = () => {
  const { user } = useUser();
  const supabase = createClient();

  return useQuery<UserDog[], Error>({
    queryKey: ['dogs', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to fetch dogs');
      }

      return (data as UserDog[]) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Options for the profile update mutation.
 */
export interface UpdateProfileOptions {
  profileData: UpdatableProfileData;
  recordConsent?: boolean;
}

/**
 * Updates the user's profile with the provided fields and refreshes the cache.
 * Optionally records user consent to legal documents.
 *
 * @returns A mutation result that resolves to the updated profile.
 * @throws {Error} When Supabase rejects the update request or user is not authenticated.
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const supabase = createClient();

  return useMutation<UserProfile, Error, UpdateProfileOptions>({
    mutationFn: async ({ profileData, recordConsent }) => {
      if (!user) throw new Error('User not authenticated');

      // Get current profile from cache for comparison
      const currentProfile = queryClient.getQueryData<UserProfile>(['profile', user.id]);

      // Separate fields into groups:
      // 1. Socials
      const { facebook_url, instagram_url, linkedin_url, airbnb_url, other_social_url, ...rest } =
        profileData;

      // 2. Private Info
      const {
        email,
        phone_number,
        street_address,
        zip_code,
        emergency_contact_name,
        emergency_contact_number,
        emergency_contact_email,
        // display_lat/lng are on profiles (public fuzzy loc)?
        // No, display_lat/lng are usually calculated from private address but stored on profiles for public view.
        // Let's verify schema... yes, display_lat is on profiles.
        ...publicProfileData
      } = rest as Record<string, unknown>;

      const socialData = {
        facebook_url,
        instagram_url,
        linkedin_url,
        airbnb_url,
        other_social_url,
      };

      const privateData = {
        email,
        phone_number,
        street_address,
        zip_code,
        emergency_contact_name,
        emergency_contact_number,
        emergency_contact_email,
      };

      // Clean undefined from privateData for upsert
      const cleanPrivateData = Object.fromEntries(
        Object.entries(privateData).filter(([, value]) => value !== undefined)
      );

      // Compare public profile fields to detect changes
      const changedProfileFields = Object.entries(publicProfileData).filter(([key, newValue]) => {
        // Skip if not being updated (undefined)
        if (newValue === undefined) return false;

        // Compare with current value
        const currentValue = currentProfile?.[key as keyof UserProfile];

        // Normalize null and undefined as equivalent
        const normalizedNew = newValue ?? null;
        const normalizedCurrent = currentValue ?? null;

        return normalizedNew !== normalizedCurrent;
      });

      let profileResult = currentProfile;

      // 1. Update Public Profile (ONLY if there are changes)
      if (changedProfileFields.length > 0) {
        const updatedProfileData = Object.fromEntries(changedProfileFields);

        const { data, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            // email removed from profiles!
            ...updatedProfileData,
          })
          .select()
          .single();

        if (profileError) {
          throw new Error(profileError.message || 'Failed to update public profile');
        }

        profileResult = data;
      }

      // 2. Update Private Info (ONLY if there are changes)
      if (Object.keys(cleanPrivateData).length > 0) {
        // Compare private fields to detect changes
        const changedPrivateFields = Object.entries(cleanPrivateData).filter(([key, newValue]) => {
          const currentValue = currentProfile?.[key as keyof UserProfile];

          // Normalize null and undefined as equivalent
          const normalizedNew = newValue ?? null;
          const normalizedCurrent = currentValue ?? null;

          return normalizedNew !== normalizedCurrent;
        });

        // Only update if there are actual changes
        if (changedPrivateFields.length > 0) {
          const updatedPrivateData = Object.fromEntries(changedPrivateFields);

          const { error: privateError } = await supabase
            .from('user_private_info')
            .update({
              // Use update, row should exist.
              ...updatedPrivateData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (privateError) {
            console.error('Failed to update private info:', privateError);
            throw new Error(privateError.message || 'Failed to update private info');
          }
        }
      }

      // 3. Update Socials (ONLY if there are changes)
      // Filter to only include fields that:
      // a) Are defined in the update (not undefined)
      // b) Are different from the current value
      const changedSocialFields = Object.entries(socialData).filter(([key, newValue]) => {
        // Skip if not being updated (undefined)
        if (newValue === undefined) return false;

        // Compare with current value
        const currentValue = currentProfile?.[key as keyof UserProfile];

        // Normalize null and undefined as equivalent (both mean "empty")
        const normalizedNew = newValue ?? null;
        const normalizedCurrent = currentValue ?? null;

        return normalizedNew !== normalizedCurrent;
      });

      // Only perform database update if there are actual changes
      if (changedSocialFields.length > 0) {
        const updatedSocialData = Object.fromEntries(changedSocialFields);

        const { error: socialError } = await supabase.from('profile_socials').upsert({
          user_id: user.id,
          ...updatedSocialData,
        });

        if (socialError) {
          console.error('Failed to update social links:', socialError);
        }
      }

      // 4. Record consent if requested
      if (recordConsent) {
        const documentTypes = ['tos', 'privacy_policy', 'community_guidelines'] as const;
        const consents = documentTypes.map((docType) => ({
          user_id: user.id,
          document_type: docType,
          document_version: '1.0',
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }));

        const { error: consentError } = await supabase.from('user_consents').insert(consents);

        if (consentError) {
          console.error('Failed to record consent:', consentError);
          // Don't throw - profile update succeeded, consent is secondary
        }
      }

      // Return combined result (mocking it since we did multiple writes)
      // Filter out undefined values to avoid overwriting existing data
      const cleanSocialData = Object.fromEntries(
        Object.entries(socialData).filter(([, value]) => value !== undefined)
      );

      return {
        ...profileResult,
        ...cleanPrivateData,
        ...cleanSocialData,
      } as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['consents', user?.id] });
    },
  });
};

// #endregion Hooks
