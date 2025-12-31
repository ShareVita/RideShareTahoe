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

        // Check if there's a block relationship between current user and other user
        const { data: blockData, error: blockError } = await supabase
          .from('user_blocks')
          .select('id')
          .or(`and(blocker_id.eq.${otherUserId}),and(blocked_id.eq.${otherUserId})`)
          .maybeSingle();

        if (blockError) {
          console.error('Error checking block status:', blockError);
          setIsBlocked(false);
        } else {
          setIsBlocked(!!blockData);
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
