/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/libs/email';
jest.unmock('next/server');
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}));
jest.mock('@/libs/email', () => ({
  getAppUrl: () => 'https://ridesharetahoe.com',
  sanitizeForLog: (value: string) => value,
  sendEmail: jest.fn(),
  recordUserActivity: jest.fn(),
  scheduleNurtureEmail: jest.fn(),
  scheduleCommunityGrowthEmail: jest.fn(),
}));

const completeProfile = {
  id: 'user-1',
  first_name: 'Ava',
  last_name: 'Skier',
  display_lat: 0,
  display_lng: -120,
};
function setup(profile: unknown, welcome: unknown, metadata = {}, email?: string) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(profile),
    maybeSingle: jest.fn(),
  };
  chain.single.mockResolvedValue({ data: profile, error: null });
  chain.maybeSingle.mockResolvedValueOnce({ data: welcome, error: null });
  const activity = { insert: jest.fn().mockResolvedValue({ error: null }) };
  const adminFrom = jest.fn((table: string) => (table === 'user_activity' ? activity : chain));
  (createAdminClient as jest.Mock).mockReturnValue({ from: adminFrom });
  const authResult = {
    data: { session: {}, user: { id: 'user-1', user_metadata: metadata, email } },
    error: null,
  };
  (createClient as jest.Mock).mockResolvedValue({
    from: () => chain,
    auth: {
      exchangeCodeForSession: () => Promise.resolve(authResult),
      verifyOtp: () => Promise.resolve(authResult),
    },
  });
  return { chain, activity, adminFrom };
}
beforeEach(() => jest.clearAllMocks());
it('routes complete users to community without a role or phone number, even without welcome-email history', async () => {
  setup(completeProfile, null);
  const response = await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
  expect(response.headers.get('location')).toMatch(/^http:\/\/localhost\/community\?/);
  expect(sendEmail).not.toHaveBeenCalled();
});
it('routes a returning member with names and location to community', async () => {
  setup(completeProfile, { id: 1 });
  const response = await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
  expect(response.headers.get('location')).toMatch(/^http:\/\/localhost\/community\?/);
});
it.each([[{ ...completeProfile, last_name: ' ' }], [{ ...completeProfile, display_lat: null }]])(
  'routes incomplete users to edit even when a welcome email exists',
  async (profile) => {
    setup(profile, { id: 1 });
    const response = await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
    expect(response.headers.get('location')).toContain('/profile/edit?');
  }
);

it.each(['code=valid', 'token_hash=valid&type=email'])(
  'records every returning login with service client: %s',
  async (params) => {
    const { activity, chain } = setup(completeProfile, { id: 1 });
    await GET(new NextRequest(`http://localhost/api/auth/callback?${params}`));
    expect(activity.insert).toHaveBeenCalledTimes(1);
    expect(activity.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      event: 'login',
      metadata: { source: 'auth_callback' },
    });
    expect(chain.insert).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  }
);
it.each([completeProfile, { ...completeProfile, first_name: null, profile_photo_url: null }])(
  'does not overwrite edited or deliberately cleared profile fields with Google metadata',
  async (profile) => {
    const { chain } = setup(
      profile,
      { id: 1 },
      { given_name: 'Google', family_name: 'Name', picture: 'https://example.test/google.jpg' },
      'member@example.test'
    );
    await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
    expect(chain.insert).not.toHaveBeenCalled();
    // The only upsert is the service-owned private email, never profile metadata.
    expect(chain.upsert).toHaveBeenCalledWith(
      { id: 'user-1', email: 'member@example.test' },
      { onConflict: 'id' }
    );
  }
);
it('records first login once, even when sending welcome', async () => {
  const { activity } = setup(completeProfile, null, {}, 'member@example.test');
  await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
  expect(activity.insert).toHaveBeenCalledTimes(1);
  expect(sendEmail).toHaveBeenCalledTimes(1);
});
it('seeds only a missing profile from provider metadata', async () => {
  const { chain } = setup(
    null,
    { id: 1 },
    { given_name: 'Google', family_name: 'Name', picture: 'https://example.test/google.jpg' }
  );
  chain.single
    .mockReset()
    .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    .mockResolvedValueOnce({ data: completeProfile, error: null });
  const response = await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
  expect(chain.insert).toHaveBeenCalledWith({
    id: 'user-1',
    first_name: 'Google',
    last_name: 'Name',
    profile_photo_url: 'https://example.test/google.jpg',
  });
  expect(response.headers.get('location')).toContain('/profile/edit?');
});
it('does not treat profile lookup failures as missing profiles', async () => {
  const { chain } = setup(null, { id: 1 });
  chain.single.mockResolvedValue({ data: null, error: { code: 'timeout' } });
  await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
  expect(chain.insert).not.toHaveBeenCalled();
});
it('does not record activity for a failed exchange', async () => {
  const { activity } = setup(completeProfile, { id: 1 });
  const client = await createClient();
  client.auth.exchangeCodeForSession = jest
    .fn()
    .mockResolvedValue({ data: { session: null, user: null }, error: { message: 'invalid code' } });
  const response = await GET(new NextRequest('http://localhost/api/auth/callback?code=invalid'));
  expect(response.headers.get('location')).toContain('error=session_exchange_failed');
  expect(activity.insert).not.toHaveBeenCalled();
});
it('fails closed on welcome history lookup errors but still records login', async () => {
  const { chain, activity } = setup(completeProfile, null, {}, 'member@example.test');
  chain.maybeSingle
    .mockReset()
    .mockResolvedValue({ data: null, error: { message: 'history unavailable' } });
  const response = await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
  expect(response.headers.get('location')).toContain('error=unexpected_error');
  expect(activity.insert).toHaveBeenCalledTimes(1);
  expect(sendEmail).not.toHaveBeenCalled();
});
it('continues successful authentication when login ingestion fails', async () => {
  const { activity } = setup(completeProfile, { id: 1 });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  activity.insert.mockResolvedValue({ error: { message: 'ingestion unavailable' } } as never);
  const response = await GET(new NextRequest('http://localhost/api/auth/callback?code=valid'));
  expect(response.headers.get('location')).toContain('/community?');
  expect(log).toHaveBeenCalledWith('Failed to record login activity:', {
    message: 'ingestion unavailable',
  });
  log.mockRestore();
});

it('continues when activity insertion throws and preserves member edits', async () => {
  const { activity, chain } = setup(completeProfile, { id: 1 }, { given_name: 'Provider' });
  activity.insert.mockRejectedValue(new Error('unavailable') as never);
  const response = await GET(
    new NextRequest('http://localhost/api/auth/callback?code=valid&next=%2Fmessages%3Fthread%3D42')
  );
  expect(response.headers.get('location')).toBe('http://localhost/messages?thread=42');
  expect(chain.insert).not.toHaveBeenCalled();
});

it.each(['code=valid', 'token_hash=valid&type=email'])(
  'preserves intended query through %s',
  async (params) => {
    setup(completeProfile, { id: 1 });
    const next = '/rides/post?trip=42&mode=return';
    const response = await GET(
      new NextRequest(
        `http://localhost/api/auth/callback?${params}&next=${encodeURIComponent(next)}`
      )
    );
    expect(response.headers.get('location')).toBe(`http://localhost${next}`);
  }
);

it.each([null, { ...completeProfile, display_lat: null }])(
  'carries next into required profile completion',
  async (profile) => {
    const { chain } = setup(profile, { id: 1 });
    if (!profile)
      chain.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: completeProfile, error: null });
    const response = await GET(
      new NextRequest(
        'http://localhost/api/auth/callback?code=valid&next=%2Fmessages%3Fthread%3D42'
      )
    );
    const url = new URL(response.headers.get('location')!);
    expect(url.pathname).toBe('/profile/edit');
    expect(url.searchParams.get('next')).toBe('/messages?thread=42');
  }
);

it.each([
  '//evil.test',
  '/\\evil.test',
  'https://evil.test',
  '/%2fevil.test',
  '/login',
  '/foo/../api/auth/callback',
  '/messages\n',
])('rejects unsafe callback next %s', async (next) => {
  setup(completeProfile, { id: 1 });
  const response = await GET(
    new NextRequest(
      `http://localhost/api/auth/callback?code=valid&next=${encodeURIComponent(next)}`
    )
  );
  expect(response.headers.get('location')).toMatch(/^http:\/\/localhost\/community\?/);
});
