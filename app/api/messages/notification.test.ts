import type { NextRequest } from 'next/server';
import { POST } from './route';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserWithEmail, sendEmail } from '@/libs/email';

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
  ensureProfileComplete: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/libs/rateLimit', () => ({
  checkSupabaseRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/libs/email', () => ({
  getAppUrl: () => 'https://www.ridesharetahoe.com',
  getUserWithEmail: jest.fn(),
  sendEmail: jest.fn(),
}));

const senderId = '123e4567-e89b-12d3-a456-426614174000';
const recipientId = '123e4567-e89b-12d3-a456-426614174001';
const conversationId = '123e4567-e89b-12d3-a456-4266141740aa';

/** The member's own client: an existing conversation and a successful insert. */
function memberClient() {
  const conversations = {
    select: () => conversations,
    or: () => conversations,
    is: () => conversations,
    maybeSingle: async () => ({ data: { id: conversationId } }),
    update: () => ({ eq: async () => ({ error: null }) }),
  };
  const messages = {
    insert: () => ({
      select: () => ({ single: async () => ({ data: { id: 'message-2' }, error: null }) }),
    }),
  };
  return { from: (table: string) => (table === 'conversations' ? conversations : messages) };
}

/** The service-role client: the sender's name and the recipient's earlier unread count. */
function adminClient(earlierUnread: number) {
  const unreadQuery = {
    select: () => unreadQuery,
    eq: () => unreadQuery,
    neq: async () => ({ count: earlierUnread, error: null }),
  };
  const profiles = {
    select: () => ({
      eq: () => ({ single: async () => ({ data: { first_name: 'Ava', last_name: 'Skier' } }) }),
    }),
  };
  return { from: (table: string) => (table === 'profiles' ? profiles : unreadQuery) };
}

function send(): Promise<Response> {
  const request = {
    json: async () => ({ recipient_id: recipientId, content: 'Still have a seat Saturday?' }),
  } as unknown as NextRequest;
  return POST(request);
}

describe('new-message email notification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-12-13T14:00:00Z'));
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user: { id: senderId },
      authError: null,
      supabase: memberClient(),
    });
    (getUserWithEmail as jest.Mock).mockResolvedValue({
      id: recipientId,
      first_name: 'Ben',
      last_name: null,
      email: 'ben@example.test',
    });
  });
  afterEach(() => jest.useRealTimers());

  it('emails once with a link to the thread and the time in Tahoe', async () => {
    (createAdminClient as jest.Mock).mockReturnValue(adminClient(0));

    const response = await send();

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { payload } = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(payload.messageUrl).toBe(
      `https://www.ridesharetahoe.com/messages?conversation=${conversationId}`
    );
    expect(payload.messageTime).toBe('Dec 13, 2026, 6:00 AM');
  });

  it('does not email again while an earlier message in the thread is unread', async () => {
    (createAdminClient as jest.Mock).mockReturnValue(adminClient(2));

    const response = await send();

    expect(response.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
