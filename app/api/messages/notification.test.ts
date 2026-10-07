import type { NextRequest } from 'next/server';
import { POST } from './route';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserWithEmail, sendEmail } from '@/libs/email';
import { alreadyNotifiedOfUnread } from '@/libs/email/messageNotifications';

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
  ensureProfileComplete: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/libs/rateLimit', () => ({
  checkSupabaseRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/libs/email/messageNotifications', () => ({ alreadyNotifiedOfUnread: jest.fn() }));
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

/** The service-role client: only the sender's name is read directly. */
function adminClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { first_name: 'Ava', last_name: 'Skier' } }) }),
      }),
    }),
  };
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

  it('emails with a link to the thread and the time in Tahoe', async () => {
    (createAdminClient as jest.Mock).mockReturnValue(adminClient());
    (alreadyNotifiedOfUnread as jest.Mock).mockResolvedValue(false);

    const response = await send();

    expect(response.status).toBe(200);
    expect(alreadyNotifiedOfUnread).toHaveBeenCalledWith(expect.anything(), {
      recipientId,
      conversationId,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { payload } = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(payload.messageUrl).toBe(
      `https://www.ridesharetahoe.com/messages?conversation=${conversationId}`
    );
    expect(payload.messageTime).toBe('Dec 13, 2026, 6:00 AM');
  });

  it('does not email again when this unread stretch was already emailed', async () => {
    (createAdminClient as jest.Mock).mockReturnValue(adminClient());
    (alreadyNotifiedOfUnread as jest.Mock).mockResolvedValue(true);

    const response = await send();

    expect(response.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('still emails when the earlier-notification check fails', async () => {
    (createAdminClient as jest.Mock).mockReturnValue(adminClient());
    (alreadyNotifiedOfUnread as jest.Mock).mockRejectedValue(new Error('database unavailable'));

    const response = await send();

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
