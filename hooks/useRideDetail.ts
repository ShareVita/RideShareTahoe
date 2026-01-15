import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RidePostType } from '@/app/community/types';

/**
 * Represents the state returned from `useRideDetail` when querying a single ride.
 */
interface UseRideDetailResult {
  /** The fetched ride data or null when missing. */
  ride: RidePostType | null;
  /** True while the ride query is in progress. */
  loading: boolean;
  /** Error message to surface when the ride cannot be loaded. */
  error: string | null;
  /** Refresh function that re-fetches the ride detail. */
  refresh: () => Promise<void>;
}

/**
 * Fetches detail data for a single ride post and exposes the loading state.
 *
 * @param rideId The ID of the ride to load; if omitted, the states reset to null.
 * @returns The ride detail state, including a refresh callback.
 */
export function useRideDetail(rideId?: string): UseRideDetailResult {
  const [ride, setRide] = useState<RidePostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRideDetails = useCallback(async () => {
    if (!rideId) {
      setRide(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let query = supabase
        .from('rides')
        .select(
          `
          *,
          owner:profiles!rides_poster_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            city,
            bio,
            role,
            community_support_badge,
            support_preferences,
            support_story,
            other_support_description,
            facebook_url,
            instagram_url,
            linkedin_url,
            airbnb_url,
            other_social_url
          )
        `
        )
        .eq('id', rideId);

      // When not logged in, only show active rides; logged-in users rely on RLS.
      if (!user) {
        query = query.eq('status', 'active');
      }

      const { data, error: queryError } = await query.single<RidePostType>();

      if (queryError || !data) {
        console.error('Error fetching ride:', queryError);
        if (queryError?.code === 'PGRST116' || !data) {
          setError('This ride is no longer active or has been removed.');
        } else {
          setError('Failed to load ride details');
        }
        setRide(null);
        return;
      }

      setRide(data);
    } catch (err) {
      console.error('Error fetching ride:', err);
      setError('Failed to load ride details');
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    if (!rideId) {
      setRide(null);
      setError(null);
      setLoading(false);
      return;
    }

    void fetchRideDetails();
  }, [rideId, fetchRideDetails]);

  return { ride, loading, error, refresh: fetchRideDetails };
}
