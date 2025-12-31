import { useEffect, useState } from 'react';
import { createClient } from '@/libs/supabase/client';

/**
 * Hook to check if the current user is blocked by or has blocked another user.
 * Returns true if there's a two-way mirror block between them.
 *
 * @param otherUserId - The ID of the user to check blocking status with
 * @returns Object with isBlocked status and loading state
 */
export function useIsBlocked(otherUserId?: string) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!otherUserId) {
      setLoading(false);
      return;
    }

    const checkBlockStatus = async () => {
      try {
        const supabase = createClient();

        // Use DB-side RPC to ensure the auth.uid() context is respected
        const { data, error } = await supabase.rpc('is_user_blocked', {
          other_user_id: otherUserId,
        });

        if (error) {
          console.error('Error calling is_user_blocked RPC:', error);
          setIsBlocked(false);
        } else if (typeof data === 'boolean') {
          setIsBlocked(Boolean(data));
        } else if (Array.isArray(data) && data.length > 0) {
          // Some Supabase responses return arrays for scalar RPCs in certain setups
          setIsBlocked(Boolean(data[0]));
        } else {
          setIsBlocked(Boolean(data));
        }
      } catch (err) {
        console.error('Error checking block status:', err);
        setIsBlocked(false);
      } finally {
        setLoading(false);
      }
    };

    checkBlockStatus();
  }, [otherUserId]);

  return { isBlocked, loading };
}
