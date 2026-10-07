/** @jest-environment node */
import {
  canSendMarketingEmail,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  MARKETING_EMAIL_TYPES,
  unsubscribeMarketing,
} from './preferences';
import type { SupabaseClient } from '@supabase/supabase-js';
jest.mock('./helpers', () => ({ getAppUrl: () => 'https://ridesharetahoe.com' }));

const userId = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  process.env.EMAIL_UNSUBSCRIBE_SECRET = 'test-only-secret-with-at-least-32-characters';
});

it('binds unsubscribe to a user and purpose, not an email address supplied by the caller', () => {
  const token = createUnsubscribeToken(userId);
  expect(verifyUnsubscribeToken(token)).toBe(userId);
  expect(verifyUnsubscribeToken(token.replace('11111111', '22222222'))).toBeNull();
  expect(verifyUnsubscribeToken(`${userId}.invalid`)).toBeNull();
  expect(verifyUnsubscribeToken('user@example.com')).toBeNull();
  process.env.EMAIL_UNSUBSCRIBE_SECRET = 'rotated-test-secret-with-at-least-32-characters';
  expect(verifyUnsubscribeToken(token)).toBeNull();
});

it('refuses unsigned marketing when secret is not configured', () => {
  delete process.env.EMAIL_UNSUBSCRIBE_SECRET;
  expect(() => createUnsubscribeToken(userId)).toThrow('EMAIL_UNSUBSCRIBE_SECRET');
});

it('separates optional marketing from account/trip/message notifications', () => {
  for (const type of [
    'nurture_day3',
    'nurture_week1',
    'reengage',
    'bulk_announcement',
    'welcome_bulk',
    'community_growth_day30',
    'review_request',
  ])
    expect(MARKETING_EMAIL_TYPES.has(type)).toBe(true);
  for (const type of ['welcome', 'new_message', 'meeting_scheduled', 'meeting_reminder'])
    expect(MARKETING_EMAIL_TYPES.has(type)).toBe(false);
});

function database(result: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  return { client: { from: jest.fn(() => chain) } as unknown as SupabaseClient, chain };
}

it.each([null, '2026-10-06T12:00:00Z'])('respects persisted opt-out value %s', async (value) => {
  const { client } = database({ data: { marketing_unsubscribed_at: value }, error: null });
  expect(await canSendMarketingEmail(client, userId)).toBe(value === null);
});

it('fails closed on missing profiles and schema/query errors', async () => {
  expect(await canSendMarketingEmail(database({ data: null, error: null }).client, userId)).toBe(
    false
  );
  await expect(
    canSendMarketingEmail(
      database({ data: null, error: { message: 'missing column' } }).client,
      userId
    )
  ).rejects.toThrow('missing column');
});

it('updates only the signed user and verifies a row was persisted', async () => {
  const { client, chain } = database({ data: { id: userId }, error: null });
  await unsubscribeMarketing(client, userId);
  expect(chain.eq).toHaveBeenCalledWith('id', userId);
  expect(chain.update).toHaveBeenCalledWith({ marketing_unsubscribed_at: expect.any(String) });
  await expect(
    unsubscribeMarketing(database({ data: null, error: null }).client, userId)
  ).rejects.toThrow('Unable to save');
});
