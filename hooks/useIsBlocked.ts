import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/libs/supabase/client';
import { useBlockedUsersContext } from '@/contexts/BlockedUsersContext';

/**
 * Hook to check if the current user is blocked by or has blocked another user.
 * Returns true if there's a two-way mirror block between them.
 *
 * Optimization: If wrapped in BlockedUsersProvider, uses cached data from context
 * instead of making an individual RPC call per user. This prevents N+1 queries
 * when rendering lists of cards.
 *
 * @param otherUserId - The ID of the user to check blocking status with
 * @returns Object with isBlocked status, loading state, and refetch function
 */
export function useIsBlocked(otherUserId?: string) {
  // Try to use context first (batched query optimization)
  const blockedUsersContext = useBlockedUsersContext();

  const [isBlockedState, setIsBlockedState] = useState(false);
  const [loadingState, setLoadingState] = useState(true);

  // Memoize the Supabase client to prevent re-creation on every render
  const supabase = useMemo(() => createClient(), []);

  const checkBlockStatusViaRpc = useCallback(async () => {
    if (!otherUserId) {
      setLoadingState(false);
      return;
    }

    setLoadingState(true);
    try {
      // Use DB-side RPC to ensure the auth.uid() context is respected
      const { data, error } = await supabase.rpc('is_user_blocked', {
        other_user_id: otherUserId,
      });

      if (error) {
        console.error('Error calling is_user_blocked RPC:', error);
        setIsBlockedState(false);
      } else if (typeof data === 'boolean') {
        setIsBlockedState(Boolean(data));
      } else if (Array.isArray(data) && data.length > 0) {
        // Some Supabase responses return arrays for scalar RPCs in certain setups
        setIsBlockedState(Boolean(data[0]));
      } else {
        setIsBlockedState(Boolean(data));
      }
    } catch (err) {
      console.error('Error checking block status:', err);
      setIsBlockedState(false);
    } finally {
      setLoadingState(false);
    }
  }, [otherUserId, supabase]);

  useEffect(() => {
    // Only make RPC call if context is not available
    if (!blockedUsersContext) {
      checkBlockStatusViaRpc();
    }
  }, [blockedUsersContext, checkBlockStatusViaRpc]);

  // If context is available, use it (O(1) lookup from cached set)
  if (blockedUsersContext) {
    return {
      isBlocked: otherUserId ? blockedUsersContext.isBlocked(otherUserId) : false,
      loading: blockedUsersContext.loading,
      refetch: blockedUsersContext.refetch,
    };
  }

  // Fall back to individual RPC call
  return {
    isBlocked: isBlockedState,
    loading: loadingState,
    refetch: checkBlockStatusViaRpc,
  };
}
