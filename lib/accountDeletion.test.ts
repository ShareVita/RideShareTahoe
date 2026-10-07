/** @jest-environment node */
import type { SupabaseClient } from '@supabase/supabase-js';
import { processDeletionRequest, processScheduledDeletions } from './accountDeletion';
import { createAdminClient } from '@/lib/supabase/server';
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));

function database(claim: unknown, deletionError: Error | null = null, resetError: unknown = null) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(claim),
    // eslint-disable-next-line no-unused-vars
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve({ error: resetError }).then(resolve),
  };
  const deleteUser = jest.fn().mockResolvedValue({ error: deletionError });
  return {
    chain,
    deleteUser,
    client: {
      from: jest.fn(() => chain),
      auth: { admin: { deleteUser } },
    } as unknown as SupabaseClient,
  };
}
const request = { id: 'request-1', user_id: 'user-1' };

it('claims only due pending requests and deletes Auth first, relying on FK cascades', async () => {
  const db = database({ data: { id: request.id }, error: null });
  const processed: string[] = [];
  const errors: { userId: string; error: string }[] = [];
  await processDeletionRequest(db.client, request, processed, errors);
  expect(db.chain.eq).toHaveBeenCalledWith('status', 'pending');
  expect(db.chain.lte).toHaveBeenCalledWith('scheduled_deletion_date', expect.any(String));
  expect(db.deleteUser).toHaveBeenCalledWith('user-1');
  expect(db.client.from).toHaveBeenCalledTimes(1);
  expect(processed).toEqual(['user-1']);
  expect(errors).toEqual([]);
});

it.each([
  { data: null, error: null },
  { data: null, error: { message: 'claim failed' } },
])('never deletes an unclaimed/cancelled request', async (claim) => {
  const db = database(claim);
  await processDeletionRequest(db.client, request, [], []);
  expect(db.deleteUser).not.toHaveBeenCalled();
});

it('retains account data and resets the claim after Auth rejection', async () => {
  const db = database(
    { data: { id: request.id }, error: null },
    Object.assign(new Error('Auth unavailable'), { name: 'AuthApiError', status: 403 })
  );
  const processed: string[] = [];
  const errors: { userId: string; error: string }[] = [];
  await processDeletionRequest(db.client, request, processed, errors);
  expect(db.chain.update).toHaveBeenLastCalledWith({ status: 'pending', processed_at: null });
  expect(db.chain.eq).toHaveBeenCalledWith('status', 'processing');
  expect(processed).toEqual([]);
  expect(errors[0].error).toBe('Auth unavailable');
});

it('reclaims only processing leases strictly older than 15 minutes using original timestamp CAS', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-06T12:00:00Z'));
  try {
    for (const [timestamp, eligible] of [
      ['2026-10-06T11:44:59.999Z', true],
      ['2026-10-06T11:45:00.000Z', false],
      ['2026-10-06T11:59:00.000Z', false],
    ] as const) {
      const db = database({ data: { id: request.id }, error: null });
      await processDeletionRequest(
        db.client,
        { ...request, status: 'processing', processed_at: timestamp },
        [],
        []
      );
      expect(db.deleteUser).toHaveBeenCalledTimes(eligible ? 1 : 0);
      if (eligible) {
        expect(db.chain.eq).toHaveBeenCalledWith('status', 'processing');
        expect(db.chain.eq).toHaveBeenCalledWith('processed_at', timestamp);
        expect(db.chain.lt).toHaveBeenCalledWith('processed_at', '2026-10-06T11:45:00.000Z');
      }
    }
  } finally {
    jest.useRealTimers();
  }
});

it('keeps a reclaimed failure processing, so an old in-flight worker cannot delete after cancellation', async () => {
  const db = database(
    { data: { id: request.id }, error: null },
    Object.assign(new Error('Auth rejected'), { name: 'AuthApiError', status: 403 })
  );
  await processDeletionRequest(
    db.client,
    { ...request, status: 'processing', processed_at: '2025-01-01T00:00:00Z' },
    [],
    []
  );
  expect(db.chain.update).toHaveBeenCalledTimes(1);
});

it('holds unknown transport outcomes for lease recovery instead of reopening cancellation', async () => {
  const db = database({ data: { id: request.id }, error: null }, new Error('network timeout'));
  await processDeletionRequest(db.client, request, [], []);
  expect(db.chain.update).toHaveBeenCalledTimes(1);
});

it('fences a rejected initial worker’s release with its exact claim timestamp', async () => {
  const db = database(
    { data: { id: request.id }, error: null },
    Object.assign(new Error('Auth rejected'), { name: 'AuthApiError', status: 403 })
  );
  await processDeletionRequest(db.client, request, [], []);
  expect(db.chain.eq).toHaveBeenLastCalledWith(
    'processed_at',
    db.chain.update.mock.calls[0][0].processed_at
  );
});

it('constructs the elevated runner client only on invocation and selects due pending/expired processing', async () => {
  const originalFlag = process.env.ACCOUNT_DELETION_ENABLED;
  process.env.ACCOUNT_DELETION_ENABLED = 'true';
  const query = {
    select: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
  expect(createAdminClient).not.toHaveBeenCalled();
  (createAdminClient as jest.Mock).mockReturnValue({ from: () => query });
  expect(await processScheduledDeletions()).toEqual({
    processedCount: 0,
    processedUsers: [],
    errors: [],
  });
  expect(query.or).toHaveBeenCalledWith(
    expect.stringMatching(/^status.eq.pending,and\(status.eq.processing,processed_at.lt./)
  );
  if (originalFlag === undefined) delete process.env.ACCOUNT_DELETION_ENABLED;
  else process.env.ACCOUNT_DELETION_ENABLED = originalFlag;
});

it('does not construct an admin client or delete while activation is disabled', async () => {
  const originalFlag = process.env.ACCOUNT_DELETION_ENABLED;
  delete process.env.ACCOUNT_DELETION_ENABLED;
  jest.clearAllMocks();
  await expect(processScheduledDeletions()).rejects.toThrow('disabled');
  expect(createAdminClient).not.toHaveBeenCalled();
  if (originalFlag !== undefined) process.env.ACCOUNT_DELETION_ENABLED = originalFlag;
});
