/** @jest-environment node */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { createAdminClient } from '@/lib/supabase/server';
import { alreadyNotifiedOfUnread } from './messageNotifications';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Destructive integration fixtures require a disposable local Supabase');
}
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
}) as unknown as ReturnType<typeof createAdminClient>;

let senderId: string;
let recipientId: string;

async function createUser(label: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${label}-${Date.now()}@example.test`,
    password: 'LocalIntegrationPassword123!',
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function newThread(): Promise<string> {
  const { data, error } = await admin
    .from('conversations')
    .insert({ participant1_id: senderId, participant2_id: recipientId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function message(conversationId: string, at: string, isRead = false): Promise<void> {
  const { error } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: recipientId,
    content: 'Seat still free?',
    is_read: isRead,
    created_at: at,
  });
  if (error) throw error;
}

async function emailEvent(
  conversationId: string,
  at: string,
  status: 'queued' | 'sent' | 'failed'
): Promise<void> {
  const { error } = await admin.from('email_events').insert({
    user_id: recipientId,
    email_type: 'new_message',
    status,
    to_email: 'recipient@example.test',
    payload: { threadId: conversationId },
    created_at: at,
  });
  if (error) throw error;
}

const notified = (conversationId: string) =>
  alreadyNotifiedOfUnread(admin, { recipientId, conversationId });

describe('alreadyNotifiedOfUnread against real PostgREST', () => {
  beforeAll(async () => {
    [senderId, recipientId] = await Promise.all([createUser('sender'), createUser('recipient')]);
  });

  afterAll(async () => {
    await Promise.all(
      [senderId, recipientId].filter(Boolean).map((id) => admin.auth.admin.deleteUser(id))
    );
  });

  it('is false when there is nothing unread', async () => {
    const thread = await newThread();
    await message(thread, '2026-12-01T10:00:00Z', true);
    expect(await notified(thread)).toBe(false);
  });

  it('is false for two messages sent at the same moment, so at least one of them emails', async () => {
    const thread = await newThread();
    await message(thread, '2026-12-01T10:00:00.000Z');
    await message(thread, '2026-12-01T10:00:00.050Z');
    expect(await notified(thread)).toBe(false);
  });

  it('is true once an email for this unread stretch was sent', async () => {
    const thread = await newThread();
    await message(thread, '2026-12-01T10:00:00Z');
    await emailEvent(thread, '2026-12-01T10:00:01Z', 'sent');
    await message(thread, '2026-12-01T10:05:00Z');
    expect(await notified(thread)).toBe(true);
  });

  it('is false after a failed send, so the next message retries', async () => {
    const thread = await newThread();
    await message(thread, '2026-12-01T10:00:00Z');
    await emailEvent(thread, '2026-12-01T10:00:01Z', 'failed');
    expect(await notified(thread)).toBe(false);
  });

  it('is false when the sent status was never recorded, accepting a possible duplicate', async () => {
    const thread = await newThread();
    await message(thread, '2026-12-01T10:00:00Z');
    await emailEvent(thread, '2026-12-01T10:00:01Z', 'queued');
    expect(await notified(thread)).toBe(false);
  });

  it('ignores an email from an earlier stretch the recipient has since read', async () => {
    const thread = await newThread();
    await message(thread, '2026-12-01T09:00:00Z', true);
    await emailEvent(thread, '2026-12-01T09:00:01Z', 'sent');
    await message(thread, '2026-12-01T10:00:00Z');
    expect(await notified(thread)).toBe(false);
  });

  it('ignores emails about a different thread', async () => {
    // Ride-less threads have a NULL ride_id, so the same pair can have several.
    const [thread, otherThread] = [await newThread(), await newThread()];
    await message(thread, '2026-12-01T10:00:00Z');
    await emailEvent(otherThread, '2026-12-01T10:00:01Z', 'sent');
    expect(await notified(thread)).toBe(false);
  });
});
