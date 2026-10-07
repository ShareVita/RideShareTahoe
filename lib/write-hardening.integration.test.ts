/** @jest-environment node */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { getEmailsByUserId, getUsersWithEmails } from '@/libs/email/helpers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Destructive integration fixtures require a disposable local Supabase');
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const anon = createClient<Database>(url, publishableKey, options);

/**
 * Production may use either key format for the service role. The legacy JWT
 * key is always present locally and in CI; the newer `sb_secret_` key is
 * checked too when SUPABASE_SECRET_KEY is provided.
 */
const serviceRoleKeys: Array<[label: string, key: string]> = [
  ['legacy JWT', process.env.SUPABASE_SERVICE_ROLE_KEY!],
];
if (process.env.SUPABASE_SECRET_KEY) {
  serviceRoleKeys.push(['sb_secret', process.env.SUPABASE_SECRET_KEY]);
}

interface Member {
  id: string;
  email: string;
  client: SupabaseClient<Database>;
}

async function createMember(label: string): Promise<Member> {
  const email = `${label}-${Date.now()}@example.test`;
  const password = 'LocalIntegrationPassword123!';
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  // handle_new_user does not copy the email; the auth callback normally does.
  const { error: privateError } = await admin
    .from('user_private_info')
    .upsert({ id: data.user.id, email });
  if (privateError) throw privateError;
  const client = createClient<Database>(url, publishableKey, options);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

describe('Write hardening with real Auth/PostgREST', () => {
  let sender: Member;
  let recipient: Member;
  let moderator: Member;
  let messageId: string;

  beforeAll(async () => {
    [sender, recipient, moderator] = await Promise.all([
      createMember('sender'),
      createMember('recipient'),
      createMember('moderator'),
    ]);
    const promoted = await admin.from('profiles').update({ is_admin: true }).eq('id', moderator.id);
    if (promoted.error) throw promoted.error;

    const { data: conversation, error: conversationError } = await admin
      .from('conversations')
      .insert({ participant1_id: sender.id, participant2_id: recipient.id })
      .select('id')
      .single();
    if (conversationError) throw conversationError;
    const { data: message, error: messageError } = await admin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: sender.id,
        recipient_id: recipient.id,
        content: 'original',
      })
      .select('id')
      .single();
    if (messageError) throw messageError;
    messageId = message.id;
  });

  afterAll(async () => {
    await Promise.all(
      [sender, recipient, moderator]
        .filter(Boolean)
        .map((member) => admin.auth.admin.deleteUser(member.id))
    );
  });

  it('lets a recipient mark a message read but not rewrite it', async () => {
    const markRead = await recipient.client
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
    expect(markRead.error).toBeNull();

    const rewrite = await recipient.client
      .from('messages')
      .update({ content: 'forged', sender_id: recipient.id })
      .eq('id', messageId);
    expect(rewrite.error?.code).toBe('42501');

    const stored = await admin
      .from('messages')
      .select('content, sender_id, is_read')
      .eq('id', messageId)
      .single();
    expect(stored.data).toEqual({ content: 'original', sender_id: sender.id, is_read: true });
  });

  it('lets a signed-in admin ban and unban but not grant admin', async () => {
    const ban = await moderator.client
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', sender.id);
    expect(ban.error).toBeNull();
    const unban = await moderator.client
      .from('profiles')
      .update({ is_banned: false })
      .eq('id', sender.id);
    expect(unban.error).toBeNull();

    const grant = await moderator.client
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', sender.id);
    expect(grant.error?.code).toBe('42501');
    const stored = await admin.from('profiles').select('is_admin').eq('id', sender.id).single();
    expect(stored.data?.is_admin).toBe(false);
  });

  it('does not let anonymous callers or members reset rate limits', async () => {
    for (const client of [anon, sender.client]) {
      const { error } = await client.rpc('cleanup_old_rate_limits', { p_older_than_hours: 0 });
      expect(error).not.toBeNull();
    }
  });

  it.each(serviceRoleKeys)(
    'lets the service role use the rate limiter (%s key)',
    async (_, key) => {
      const server = createClient<Database>(url, key, options);
      const { data, error } = await server.rpc('check_rate_limit', {
        p_key: `integration:${Date.now()}`,
        p_endpoint: 'integration',
        p_max_requests: 5,
        p_window_seconds: 60,
      });
      expect(error).toBeNull();
      expect(data).toMatchObject({ allowed: true });
    }
  );

  it('reads member emails without the unsupported profiles embed', async () => {
    const emails = await getEmailsByUserId(admin, [sender.id, recipient.id]);
    expect(emails.get(sender.id)).toBe(sender.email);
    expect(emails.get(recipient.id)).toBe(recipient.email);

    const users = await getUsersWithEmails(admin, { excludeBanned: true });
    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: moderator.id, email: moderator.email }),
      ])
    );
  });
});
