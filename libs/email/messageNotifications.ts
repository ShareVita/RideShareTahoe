import type { createAdminClient } from '@/lib/supabase/server';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Whether the recipient already received a new-message email for their current
 * unread stretch in this thread.
 *
 * A stretch starts at the oldest message in the thread the recipient has not
 * read. Only an email recorded as `sent` counts, so:
 * - a failed send (`failed`), a failed log write (no row) or a status update
 *   that never landed (`queued`) lets the next message email again;
 * - two messages sent at the same moment can both email (a rare duplicate),
 *   but neither can suppress the other.
 * The rule is best-effort: it prefers an occasional duplicate to a silently
 * missed notification.
 */
export async function alreadyNotifiedOfUnread(
  admin: AdminClient,
  { recipientId, conversationId }: { recipientId: string; conversationId: string }
): Promise<boolean> {
  const { data: oldestUnread, error: unreadError } = await admin
    .from('messages')
    .select('created_at')
    .eq('conversation_id', conversationId)
    .eq('recipient_id', recipientId)
    .eq('is_read', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (unreadError) throw unreadError;
  if (!oldestUnread?.created_at) return false;

  const { count, error: eventsError } = await admin
    .from('email_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', recipientId)
    .eq('email_type', 'new_message')
    .eq('status', 'sent')
    .eq('payload->>threadId', conversationId)
    .gte('created_at', oldestUnread.created_at);
  if (eventsError) throw eventsError;
  return (count ?? 0) > 0;
}
