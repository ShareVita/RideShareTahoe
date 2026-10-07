import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { processScheduledDeletions } from '@/lib/accountDeletion';

jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: () => ({ status: 401 }),
}));
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/lib/accountDeletion', () => ({ processScheduledDeletions: jest.fn() }));

describe.each([
  ['GET', GET],
  ['POST', POST],
] as const)('%s deletion authorization', (_method, handler) => {
  const request = new NextRequest('http://localhost/api/admin/process-deletions');
  let single: jest.Mock;
  let select: jest.Mock;
  let eq: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    single = jest.fn().mockResolvedValue({ data: { is_admin: false }, error: null });
    eq = jest.fn().mockReturnValue({ single });
    select = jest.fn().mockReturnValue({ eq });
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user: { id: 'member-id', user_metadata: { role: 'admin' } },
      authError: null,
      supabase: { from: jest.fn().mockReturnValue({ select }) },
    });
  });

  it('rejects unauthenticated requests without constructing an elevated client', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user: null, authError: null });
    expect((await handler(request)).status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(processScheduledDeletions).not.toHaveBeenCalled();
  });

  it.each([{ is_admin: false }, { role: 'admin' }, null, { is_admin: 'true' }])(
    'rejects non-admin persisted profile %j (ignores metadata)',
    async (profile) => {
      single.mockResolvedValue({ data: profile, error: null });
      expect((await handler(request)).status).toBe(403);
      expect(select).toHaveBeenCalledWith('is_admin');
      expect(eq).toHaveBeenCalledWith('id', 'member-id');
      expect(createAdminClient).not.toHaveBeenCalled();
      expect(processScheduledDeletions).not.toHaveBeenCalled();
    }
  );

  it('fails closed on the profile lookup error even with admin data', async () => {
    single.mockResolvedValue({ data: { is_admin: true }, error: new Error('database failed') });
    expect((await handler(request)).status).toBe(500);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(processScheduledDeletions).not.toHaveBeenCalled();
  });

  it('uses service-role access only after persisted admin authorization', async () => {
    single.mockResolvedValue({ data: { is_admin: true }, error: null });
    (processScheduledDeletions as jest.Mock).mockResolvedValue({
      processedCount: 1,
      processedUsers: ['target-user'],
      errors: [],
    });
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    const adminClient = { from: jest.fn().mockReturnValue(query) };
    (createAdminClient as jest.Mock).mockReturnValue(adminClient);
    expect((await handler(request)).status).toBe(200);
    expect(getAuthenticatedUser).toHaveBeenCalledWith(request);
    if (_method === 'POST') {
      expect(processScheduledDeletions).toHaveBeenCalledWith();
      expect(single.mock.invocationCallOrder[0]).toBeLessThan(
        (processScheduledDeletions as jest.Mock).mock.invocationCallOrder[0]
      );
      expect(createAdminClient).not.toHaveBeenCalled();
    } else {
      expect(createAdminClient).toHaveBeenCalledTimes(1);
      expect(single.mock.invocationCallOrder[0]).toBeLessThan(
        (createAdminClient as jest.Mock).mock.invocationCallOrder[0]
      );
      expect(processScheduledDeletions).not.toHaveBeenCalled();
    }
  });
});
