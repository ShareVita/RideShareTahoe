import { getReengageCandidates, processReengageEmails, scheduleReengageEmails } from './reengage';
import { sendEmail, scheduleEmail } from './sendEmail';

jest.mock('./sendEmail', () => ({ sendEmail: jest.fn(), scheduleEmail: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: mockFrom }) }));

type Login = { user_id: string; last_login_at: string | null };
let logins: Login[];
let lookupFailure: string | null;
let historyFailure: boolean;
let recentEmail: boolean;
const mockRanges = jest.fn();
const mockChunks = jest.fn();
const mockFrom = jest.fn((table: string) => {
  let ids: string[] = [];
  const result = () => {
    if (table === lookupFailure) return { data: null, error: { message: 'lookup failed' } };
    if (table === 'profiles')
      return { data: ids.map((id) => ({ id, first_name: 'Member' })), error: null };
    if (table === 'user_private_info')
      return { data: ids.map((id) => ({ id, email: `${id}@example.test` })), error: null };
    throw new Error(`Unexpected table ${table}`);
  };
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn(function (this: unknown, _key: string, values: string[]) {
      ids = values;
      mockChunks(table, values.length);
      return this;
    }),
    range: jest.fn((from: number, to: number) => {
      mockRanges(from, to);
      return Promise.resolve(
        table === lookupFailure
          ? { data: null, error: { message: 'lookup failed' } }
          : { data: logins.slice(from, to + 1), error: null }
      );
    }),
    limit: jest.fn(() =>
      Promise.resolve({
        data: recentEmail ? [{ id: 1 }] : [],
        error: historyFailure ? { message: 'history failed' } : null,
      })
    ),
    then: (resolve: Parameters<Promise<ReturnType<typeof result>>['then']>[0]) =>
      Promise.resolve(result()).then(resolve),
  };
  return chain;
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-10-20T00:00:00Z'));
  logins = [{ user_id: 'inactive', last_login_at: '2026-10-10T00:00:00Z' }];
  lookupFailure = null;
  historyFailure = recentEmail = false;
  (sendEmail as jest.Mock).mockResolvedValue({ status: 'sent' });
});
afterEach(() => jest.useRealTimers());

it('targets only the materialized latest login, not an older login or unknown history', async () => {
  // A member with old + recent history has only the recent materialized value.
  logins.push({ user_id: 'old-and-recent', last_login_at: '2026-10-19T00:00:00Z' });
  logins.push({ user_id: 'unknown', last_login_at: null });
  expect((await getReengageCandidates()).map((user) => user.id)).toEqual(['inactive']);
  expect(mockFrom).not.toHaveBeenCalledWith('user_activity');
});
it('does not infer inactivity for members without post-rollout evidence', async () => {
  logins = [];
  expect(await getReengageCandidates()).toEqual([]);
  expect(mockFrom).not.toHaveBeenCalledWith('profiles');
});
it('pages beyond 1000 members and chunks profile/private lookups', async () => {
  logins = Array.from({ length: 1205 }, (_, i) => ({
    user_id: `member-${i}`,
    last_login_at: '2026-10-10T00:00:00Z',
  }));
  expect(await getReengageCandidates()).toHaveLength(1205);
  expect(mockRanges.mock.calls).toEqual([
    [0, 999],
    [1000, 1999],
  ]);
  expect(mockChunks.mock.calls.every(([, size]) => size <= 100)).toBe(true);
  expect(mockChunks.mock.calls.filter(([table]) => table === 'user_private_info')).toHaveLength(13);
});
it.each(['user_latest_login', 'profiles', 'user_private_info'])(
  'fails closed on %s lookup errors',
  async (table) => {
    lookupFailure = table;
    await expect(processReengageEmails()).rejects.toBeDefined();
    await expect(scheduleReengageEmails()).rejects.toBeDefined();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(scheduleEmail).not.toHaveBeenCalled();
  }
);
it('fails closed on sent-history errors for sends and schedules', async () => {
  historyFailure = true;
  expect((await processReengageEmails()).errors).toHaveLength(1);
  expect((await scheduleReengageEmails()).errors).toHaveLength(1);
  expect(sendEmail).not.toHaveBeenCalled();
  expect(scheduleEmail).not.toHaveBeenCalled();
});
it('skips recent sent emails without depending on single-row errors', async () => {
  recentEmail = true;
  expect((await processReengageEmails()).skipped).toBe(1);
  expect((await scheduleReengageEmails()).scheduled).toBe(0);
});
it('uses private email lookup for eligible sends and schedules', async () => {
  expect((await processReengageEmails()).sent).toBe(1);
  expect((await scheduleReengageEmails()).scheduled).toBe(1);
  expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'inactive@example.test' }));
  expect(scheduleEmail).toHaveBeenCalledWith(
    expect.objectContaining({ payload: { userName: 'Member', userEmail: 'inactive@example.test' } })
  );
});
