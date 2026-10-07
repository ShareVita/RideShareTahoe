/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createClient } from '@/lib/supabase/server';
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
function setup(profile: unknown, welcome: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(profile),
    maybeSingle: jest.fn(),
  };
  chain.single.mockResolvedValue({ data: profile, error: null });
  chain.maybeSingle.mockResolvedValueOnce({ data: welcome, error: null });
  (createClient as jest.Mock).mockResolvedValue({
    from: () => chain,
    auth: {
      exchangeCodeForSession: () =>
        Promise.resolve({
          data: { session: {}, user: { id: 'user-1', user_metadata: {} } },
          error: null,
        }),
    },
  });
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
