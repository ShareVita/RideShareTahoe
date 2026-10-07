import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAppUrl } from './helpers';

// Product/account notifications remain transactional. These categories are optional.
export const MARKETING_EMAIL_TYPES = new Set([
  'nurture_day3',
  'nurture_week1',
  'reengage',
  'bulk_announcement',
  'welcome_bulk',
  'community_growth_day30',
  'review_request',
]);

function secret(): string {
  const value = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!value || value.length < 32)
    throw new Error('EMAIL_UNSUBSCRIBE_SECRET must be at least 32 characters');
  return value;
}

function signature(userId: string): string {
  return createHmac('sha256', secret())
    .update(`marketing-unsubscribe:v1:${userId}`)
    .digest('base64url');
}

export function createUnsubscribeToken(userId: string): string {
  return `${userId}.${signature(userId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const match =
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/.exec(
      token
    );
  if (!match) return null;
  const expected = Buffer.from(signature(match[1]));
  const actual = Buffer.from(match[2]);
  return timingSafeEqual(expected, actual) ? match[1] : null;
}

export function getUnsubscribeUrls(userId: string) {
  const token = createUnsubscribeToken(userId);
  const base = getAppUrl().replace(/\/$/, '');
  return {
    page: `${base}/unsubscribe?token=${token}`,
    oneClick: `${base}/api/email/unsubscribe?token=${token}`,
  };
}

export async function canSendMarketingEmail(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_private_info')
    .select('marketing_unsubscribed_at')
    .eq('id', userId)
    .maybeSingle();
  // Fail closed: schema/DB outages must not bypass the user's preference.
  if (error) throw new Error(`Cannot read email preference: ${error.message}`);
  return !!data && data.marketing_unsubscribed_at == null;
}

export async function unsubscribeMarketing(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('user_private_info')
    .update({ marketing_unsubscribed_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id')
    .maybeSingle();
  if (error || !data) throw new Error('Unable to save email preference');
}
