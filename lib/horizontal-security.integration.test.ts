/** @jest-environment node */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { processDeletionRequest } from './accountDeletion';
import { canSendMarketingEmail, unsubscribeMarketing } from '@/libs/email/preferences';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Destructive integration fixtures require a disposable local Supabase');
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const anon = createClient<Database>(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  options
);
let member: SupabaseClient<Database>;
let userId: string;

describe('Horizontal security and lifecycle with real Auth/PostgREST', () => {
  beforeAll(async () => {
    const email = `horizontal-${Date.now()}@example.test`;
    const password = 'LocalIntegrationPassword123!';
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    member = createClient<Database>(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      options
    );
    const { error: signInError } = await member.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it.each(['profiles', 'rides', 'vehicles'] as const)(
    'denies anonymous base-table reads: %s',
    async (table) => {
      const { data, error } = await anon.from(table).select('id');
      expect(data).toBeNull();
      expect(error?.code).toBe('42501');
    }
  );

  it('allows ordinary owner edits but rejects persisted privilege escalation', async () => {
    const ordinary = await member
      .from('profiles')
      .update({ first_name: 'Horizontal' })
      .eq('id', userId)
      .select('first_name');
    expect(ordinary.error).toBeNull();
    expect(ordinary.data).toEqual([{ first_name: 'Horizontal' }]);
    const elevated = await member.from('profiles').update({ is_admin: true }).eq('id', userId);
    expect(elevated.error?.code).toBe('42501');
    const persisted = await admin.from('profiles').select('is_admin').eq('id', userId).single();
    expect(persisted.data?.is_admin).toBe(false);
  });

  it('rounds public coordinates at the database boundary regardless of client', async () => {
    const { data, error } = await member
      .from('profiles')
      .update({
        display_lat: 39.123456,
        display_lng: -120.987654,
        display_lat_offset: 39.123456,
        display_lng_offset: -120.987654,
      })
      .eq('id', userId)
      .select('display_lat,display_lng,display_lat_offset,display_lng_offset')
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({
      display_lat: 39.12,
      display_lng: -120.99,
      display_lat_offset: null,
      display_lng_offset: null,
    });
  });

  it('keeps private-email search inaccessible to anonymous callers and ordinary members', async () => {
    const args = { search_term: '', page_number: 0, page_size: 1 };
    expect((await anon.rpc('search_users', args)).error?.code).toBe('42501');
    expect((await member.rpc('search_users', args)).error?.code).toBe('42501');
    expect(
      (await admin.from('profiles').update({ is_admin: true }).eq('id', userId)).error
    ).toBeNull();
    expect((await member.rpc('search_users', args)).error).toBeNull();
    expect(
      (await admin.from('profiles').update({ is_admin: false }).eq('id', userId)).error
    ).toBeNull();
  });

  it('persists marketing opt-out and prevents duplicate active deletion requests', async () => {
    expect(await canSendMarketingEmail(admin, userId)).toBe(true);
    await unsubscribeMarketing(admin, userId);
    expect(await canSendMarketingEmail(admin, userId)).toBe(false);
    const row = {
      user_id: userId,
      scheduled_deletion_date: new Date(Date.now() + 86400000).toISOString(),
    };
    const first = await admin.from('account_deletion_requests').insert(row).select('id').single();
    expect(first.error).toBeNull();
    expect((await admin.from('account_deletion_requests').insert(row)).error?.code).toBe('23505');
    expect(
      (await admin.from('account_deletion_requests').delete().eq('id', first.data!.id)).error
    ).toBeNull();
  });

  it('enforces deletion worker ownership even through direct member REST writes', async () => {
    expect(
      (
        await member
          .from('account_deletion_requests')
          .insert({ user_id: userId, status: 'processing' })
      ).error?.code
    ).toBe('42501');
    const request = await member
      .from('account_deletion_requests')
      .insert({ user_id: userId, scheduled_deletion_date: new Date().toISOString() })
      .select('id,scheduled_deletion_date')
      .single();
    if (request.error) throw request.error;
    const id = request.data.id;
    try {
      expect(new Date(request.data.scheduled_deletion_date).getTime() - Date.now()).toBeGreaterThan(
        29 * 24 * 60 * 60 * 1000
      );
      expect(
        (
          await member
            .from('account_deletion_requests')
            .update({ status: 'processing' })
            .eq('id', id)
        ).error?.code
      ).toBe('42501');
      expect(
        (
          await member
            .from('account_deletion_requests')
            .update({
              scheduled_deletion_date: new Date().toISOString(),
            })
            .eq('id', id)
        ).error?.code
      ).toBe('42501');
      expect(
        (
          await admin
            .from('account_deletion_requests')
            .update({
              status: 'processing',
              processed_at: new Date().toISOString(),
            })
            .eq('id', id)
        ).error
      ).toBeNull();
      expect(
        (
          await member
            .from('account_deletion_requests')
            .update({ status: 'cancelled' })
            .eq('id', id)
        ).error?.code
      ).toBe('42501');
      expect(
        (
          await admin
            .from('account_deletion_requests')
            .update({ status: 'pending', processed_at: null })
            .eq('id', id)
        ).error
      ).toBeNull();
      expect(
        (
          await member
            .from('account_deletion_requests')
            .update({ status: 'cancelled' })
            .eq('id', id)
        ).error
      ).toBeNull();
      expect(
        (await member.from('account_deletion_requests').update({ status: 'pending' }).eq('id', id))
          .error?.code
      ).toBe('42501');
    } finally {
      await admin.from('account_deletion_requests').delete().eq('id', id);
    }
  });

  it('deletes Auth first and lets real foreign-key cascades remove profile and request', async () => {
    const { data, error } = await admin
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        scheduled_deletion_date: new Date(Date.now() - 1000).toISOString(),
      })
      .select('id,user_id,status,processed_at')
      .single();
    if (error) throw error;
    const processed: string[] = [];
    const errors: { userId: string; error: string }[] = [];
    await processDeletionRequest(admin, data, processed, errors);
    expect(errors).toEqual([]);
    expect(processed).toEqual([userId]);
    expect((await admin.auth.admin.getUserById(userId)).error).not.toBeNull();
    expect((await admin.from('profiles').select('id').eq('id', userId)).data).toEqual([]);
    expect(
      (await admin.from('account_deletion_requests').select('id').eq('user_id', userId)).data
    ).toEqual([]);
  });
});
