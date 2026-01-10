'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/libs/supabase/client';

interface BlockedUsersContextType {
  blockedUserIds: Set<string>;
  loading: boolean;
  // eslint-disable-next-line no-unused-vars
  isBlocked: (userId: string) => boolean;
  refetch: () => Promise<void>;
}

const BlockedUsersContext = createContext<BlockedUsersContextType | null>(null);

/**
 * Provider that fetches all blocked user IDs once and provides them via context.
 * Child components using useIsBlocked will automatically use this cached data
 * instead of making individual RPC calls.
 */
export function BlockedUsersProvider({ children }: { children: React.ReactNode }) {
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Memoize the Supabase client
  const supabase = useMemo(() => createClient(), []);

  const fetchBlockedUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all blocks where current user is either blocker or blocked
      const { data, error } = await supabase.from('user_blocks').select('blocker_id, blocked_id');

      if (error) {
        console.error('Error fetching blocked users:', error);
        setBlockedUserIds(new Set());
        return;
      }

      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !data) {
        setBlockedUserIds(new Set());
        return;
      }

      // Build set of all user IDs that are blocked (bidirectional)
      const blockedIds = new Set<string>();
      for (const block of data) {
        if (block.blocker_id === user.id) {
          blockedIds.add(block.blocked_id);
        }
        if (block.blocked_id === user.id) {
          blockedIds.add(block.blocker_id);
        }
      }

      setBlockedUserIds(blockedIds);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      setBlockedUserIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const isBlocked = useCallback(
    (userId: string): boolean => {
      return blockedUserIds.has(userId);
    },
    [blockedUserIds]
  );

  const value = useMemo(
    () => ({
      blockedUserIds,
      loading,
      isBlocked,
      refetch: fetchBlockedUsers,
    }),
    [blockedUserIds, loading, isBlocked, fetchBlockedUsers]
  );

  return <BlockedUsersContext.Provider value={value}>{children}</BlockedUsersContext.Provider>;
}

/**
 * Hook to access the blocked users context.
 * Returns null if not wrapped in BlockedUsersProvider.
 */
export function useBlockedUsersContext(): BlockedUsersContextType | null {
  return useContext(BlockedUsersContext);
}
