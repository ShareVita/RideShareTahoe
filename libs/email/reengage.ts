import { createAdminClient } from '@/lib/supabase/server';
import { getEmailsByUserId } from './helpers';
import { scheduleEmail, sendEmail } from './sendEmail';

export interface ReengageResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: Array<{ userId: string; error: string }>;
}

interface Candidate {
  id: string;
  email: string;
  first_name: string | null;
  last_login: string;
  days_since_login: number;
}

/**
 * Only post-rollout, server-ingested logins are trustworthy. Missing materialized
 * activity means unknown, NOT inactive; legacy welcome-only history is incomplete.
 * Never scan activity history at read time or embed the unrelated private table.
 */
export async function getReengageCandidates(): Promise<Candidate[]> {
  const supabase = createAdminClient();
  const now = Date.now();
  const cutoff = new Date(now - 7 * 86400000).toISOString();
  const logins: Array<{ user_id: string; last_login_at: string }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('user_latest_login')
      .select('user_id, last_login_at')
      .lte('last_login_at', cutoff)
      .order('user_id')
      .range(from, from + 999);
    if (error) throw new Error(`Failed to fetch re-engage candidates: ${error.message}`);
    logins.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const candidates: Candidate[] = [];
  for (let start = 0; start < logins.length; start += 100) {
    const chunk = logins.slice(start, start + 100);
    const ids = chunk.map((login) => login.user_id);
    const [{ data: profiles, error }, emails] = await Promise.all([
      supabase.from('profiles').select('id, first_name').in('id', ids).eq('is_banned', false),
      getEmailsByUserId(supabase, ids),
    ]);
    if (error) throw new Error(`Failed to fetch re-engage profiles: ${error.message}`);
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.first_name]));
    for (const login of chunk) {
      if (!login.last_login_at) continue;
      const email = emails.get(login.user_id);
      const age = now - new Date(login.last_login_at).getTime();
      // Defensive check as well as the indexed database predicate.
      if (!email || !names.has(login.user_id) || !Number.isFinite(age) || age < 7 * 86400000)
        continue;
      candidates.push({
        id: login.user_id,
        email,
        first_name: names.get(login.user_id) ?? null,
        last_login: login.last_login_at,
        days_since_login: Math.floor(age / 86400000),
      });
    }
  }
  return candidates;
}

async function shouldSendReengageEmail(userId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from('email_events')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', 'reengage')
    .eq('status', 'sent')
    .gte('created_at', new Date(Date.now() - 21 * 86400000).toISOString())
    .limit(1);
  if (error) throw new Error(`Failed to check re-engagement history: ${error.message}`);
  return (data ?? []).length === 0;
}

export async function processReengageEmails(): Promise<ReengageResult> {
  // Complete all candidate lookups before any send; lookup failures fail closed.
  const candidates = await getReengageCandidates();
  const result: ReengageResult = { processed: candidates.length, sent: 0, skipped: 0, errors: [] };
  for (const user of candidates) {
    try {
      if (!(await shouldSendReengageEmail(user.id))) {
        result.skipped++;
        continue;
      }
      const event = await sendEmail({
        userId: user.id,
        to: user.email,
        emailType: 'reengage',
        payload: { userName: user.first_name || '', userEmail: user.email },
      });
      if (event.status === 'skipped') result.skipped++;
      else result.sent++;
    } catch (error) {
      result.errors.push({
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  return result;
}

export async function scheduleReengageEmails(): Promise<{
  scheduled: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const candidates = await getReengageCandidates();
  const result = { scheduled: 0, errors: [] as Array<{ userId: string; error: string }> };
  for (const user of candidates) {
    try {
      if (!(await shouldSendReengageEmail(user.id))) continue;
      await scheduleEmail({
        userId: user.id,
        emailType: 'reengage',
        runAfter: new Date(),
        payload: { userName: user.first_name || '', userEmail: user.email },
      });
      result.scheduled++;
    } catch (error) {
      result.errors.push({
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  return result;
}

export const __testExports = process.env.NODE_ENV === 'test' ? { shouldSendReengageEmail } : {};
