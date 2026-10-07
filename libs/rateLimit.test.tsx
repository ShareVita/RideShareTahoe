import { checkSupabaseRateLimit } from './rateLimit';

it('passes the exact per-user endpoint quota to the database', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: { allowed: true }, error: null });
  expect(
    await checkSupabaseRateLimit({ rpc }, 'member-7', 'messages', {
      maxRequests: 3,
      windowSeconds: 90,
    })
  ).toEqual({ success: true });
  expect(rpc).toHaveBeenCalledWith('check_rate_limit', {
    p_key: 'member-7',
    p_endpoint: 'messages',
    p_max_requests: 3,
    p_window_seconds: 90,
  });
});

it('returns a bounded retry delay when the persisted quota is exhausted', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-06T12:00:00Z'));
  try {
    const rpc = jest
      .fn()
      .mockResolvedValue({
        data: { allowed: false, reset_at: '2026-10-06T12:00:42Z' },
        error: null,
      });
    expect(await checkSupabaseRateLimit({ rpc }, 'member-7', 'messages')).toEqual({
      success: false,
      error: { message: 'Too many requests. Please try again later.', retryAfter: 42 },
    });
  } finally {
    jest.useRealTimers();
  }
});

it.each(['returned', 'thrown'] as const)(
  'does not bypass quota on a %s database failure',
  async (kind) => {
    const rpc =
      kind === 'returned'
        ? jest.fn().mockResolvedValue({ data: null, error: new Error('database unavailable') })
        : jest.fn().mockRejectedValue(new Error('database unavailable'));
    expect(await checkSupabaseRateLimit({ rpc }, 'member-7', 'bulk-email')).toEqual({
      success: false,
      error: {
        message: 'Temporarily unable to check request limits. Please try again.',
        retryAfter: 60,
      },
    });
  }
);
