/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { checkSupabaseRateLimit } from '@/libs/rateLimit';
import { sendEmail } from '@/libs/email/sendEmail';
jest.unmock('next/server');
jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
}));
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/libs/rateLimit', () => ({ checkSupabaseRateLimit: jest.fn() }));
jest.mock('@/libs/email/sendEmail', () => ({ sendEmail: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

it('never constructs an elevated client or consumes quota before authentication', async () => {
  (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user: null, authError: null });
  const response = await POST(
    new NextRequest('http://localhost/api/admin/send-bulk-email', { method: 'POST' })
  );
  expect(response.status).toBe(401);
  expect(createAdminClient).not.toHaveBeenCalled();
  expect(checkSupabaseRateLimit).not.toHaveBeenCalled();
});

it('applies the durable 10-per-minute user-scoped quota before sending', async () => {
  const adminSupabase = { rpc: jest.fn() };
  (getAuthenticatedUser as jest.Mock).mockResolvedValue({
    user: { id: 'admin-1', role: 'admin' },
    authError: null,
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { is_admin: true }, error: null }) }),
        }),
      }),
    },
  });
  (createAdminClient as jest.Mock).mockReturnValue(adminSupabase);
  (checkSupabaseRateLimit as jest.Mock).mockResolvedValue({
    success: false,
    error: { message: 'Too many requests', retryAfter: 42 },
  });
  const response = await POST(
    new NextRequest('http://localhost/api/admin/send-bulk-email', { method: 'POST', body: '{}' })
  );
  expect(checkSupabaseRateLimit).toHaveBeenCalledWith(
    adminSupabase,
    'admin-1',
    'admin-bulk-email',
    { maxRequests: 10, windowSeconds: 60 }
  );
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('42');
  expect(sendEmail).not.toHaveBeenCalled();
});

it.each([{ is_admin: false }, { role: 'admin' }, { is_admin: 'true' }, null])(
  'rejects non-admin persisted profile %j despite admin metadata',
  async (profile) => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user: { id: 'member-1', role: 'admin', user_metadata: { role: 'admin' } },
      authError: null,
      supabase: {
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }),
        }),
      },
    });
    expect(
      (
        await POST(
          new NextRequest('http://localhost/api/admin/send-bulk-email', { method: 'POST' })
        )
      ).status
    ).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(checkSupabaseRateLimit).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  }
);

it('fails closed on authorization lookup failure', async () => {
  (getAuthenticatedUser as jest.Mock).mockResolvedValue({
    user: { id: 'member-1' },
    authError: null,
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { is_admin: true }, error: new Error('lookup failed') }),
          }),
        }),
      }),
    },
  });
  expect(
    (await POST(new NextRequest('http://localhost/api/admin/send-bulk-email', { method: 'POST' })))
      .status
  ).toBe(500);
  expect(createAdminClient).not.toHaveBeenCalled();
  expect(sendEmail).not.toHaveBeenCalled();
});
