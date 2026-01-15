'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/components/providers/SupabaseUserProvider';

/**
 * Tracks the current user's unread message count and exposes derived state for visibility helpers.
 */
export function useUnreadMessages() {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false);

        if (error) throw error;
        const normalizedCount = Math.max(0, Number(count ?? 0));
        setUnreadCount(Number.isNaN(normalizedCount) ? 0 : normalizedCount);
      } catch (error) {
        console.error('Error fetching unread messages count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Subscribe to new messages or changes to existing messages
    const channel = supabase
      .channel('unread-messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const hasUnreadMessages = unreadCount > 0;

  return { unreadCount, loading, hasUnreadMessages };
}
