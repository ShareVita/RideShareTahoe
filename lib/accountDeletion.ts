import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

const DELETION_LEASE_MS = 15 * 60 * 1000;

/** Caller must authorize before invoking this elevated runner. */
export async function processScheduledDeletions(): Promise<{
  processedCount: number;
  processedUsers: string[];
  errors: { userId: string; error: string }[];
}> {
  if (process.env.ACCOUNT_DELETION_ENABLED !== 'true') {
    throw new Error('Account deletion is disabled pending backlog reconciliation');
  }
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - DELETION_LEASE_MS).toISOString();
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('*')
    .lte('scheduled_deletion_date', new Date().toISOString())
    .or(`status.eq.pending,and(status.eq.processing,processed_at.lt.${cutoff})`)
    .order('scheduled_deletion_date', { ascending: true })
    .limit(100);
  if (error) throw new Error(`Failed to fetch deletion requests: ${error.message}`);
  const processedUsers: string[] = [];
  const errors: { userId: string; error: string }[] = [];
  for (const request of data || []) {
    await processDeletionRequest(supabase, request, processedUsers, errors);
  }
  return { processedCount: processedUsers.length, processedUsers, errors };
}

/** Called only by an authorized worker with a service-role client. */
export async function processDeletionRequest(
  supabase: SupabaseClient,
  request: {
    id: string;
    user_id: string;
    reason?: string | null;
    status?: string | null;
    processed_at?: string | null;
  },
  processedUsers: string[],
  errors: { userId: string; error: string }[]
): Promise<void> {
  const originalStatus = request.status || 'pending';
  const now = new Date();
  const cutoff = new Date(now.getTime() - DELETION_LEASE_MS).toISOString();
  if (originalStatus !== 'pending' && originalStatus !== 'processing') return;
  if (
    originalStatus === 'processing' &&
    (!request.processed_at ||
      new Date(request.processed_at).getTime() >= now.getTime() - DELETION_LEASE_MS)
  )
    return;
  const claimTimestamp = now.toISOString();
  let claim = supabase
    .from('account_deletion_requests')
    .update({ status: 'processing', processed_at: claimTimestamp })
    .eq('id', request.id)
    .eq('status', originalStatus)
    .lte('scheduled_deletion_date', claimTimestamp);
  claim = request.processed_at
    ? claim.eq('processed_at', request.processed_at)
    : claim.is('processed_at', null);
  if (originalStatus === 'processing') claim = claim.lt('processed_at', cutoff);
  const { data: claimed, error: claimError } = await claim.select('id').maybeSingle();

  if (claimError) {
    errors.push({ userId: request.user_id, error: claimError.message });
    return;
  }
  // Cancellation or another worker won the conditional update.
  if (!claimed) return;

  let rejected = false;
  try {
    // Auth deletion cascades into profiles, private info and the request itself.
    // Never remove the profile first: failed Auth deletion must remain recoverable.
    const { error } = await supabase.auth.admin.deleteUser(request.user_id);
    if (error && error.code !== 'user_not_found') {
      rejected =
        error.name === 'AuthApiError' &&
        !!error.status &&
        error.status >= 400 &&
        error.status < 500;
      throw error;
    }
    processedUsers.push(request.user_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A transport failure may mean Auth is still deleting. A reclaimed lease may
    // also have an old worker in flight: never reopen cancellation in either case.
    let resetError: { message: string } | null = null;
    if (rejected && originalStatus === 'pending') {
      const result = await supabase
        .from('account_deletion_requests')
        .update({ status: 'pending', processed_at: null })
        .eq('id', request.id)
        .eq('status', 'processing')
        .eq('processed_at', claimTimestamp);
      resetError = result.error;
    }
    errors.push({
      userId: request.user_id,
      error: resetError ? `${message}; failed to release claim: ${resetError.message}` : message,
    });
  }
}
