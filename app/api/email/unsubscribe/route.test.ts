/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { createAdminClient } from '@/lib/supabase/server';
import { createUnsubscribeToken } from '@/libs/email/preferences';
jest.unmock('next/server');
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/libs/email/helpers', () => ({ getAppUrl: () => 'https://ridesharetahoe.com' }));
const userId = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  jest.clearAllMocks();
  process.env.EMAIL_UNSUBSCRIBE_SECRET = 'test-only-secret-with-at-least-32-characters';
});
it('rejects a forged or email-only opt-out before constructing an elevated client', async () => {
  const response = await POST(
    new NextRequest('http://localhost/api/email/unsubscribe?token=user@example.com', {
      method: 'POST',
    })
  );
  expect(response.status).toBe(400);
  expect(createAdminClient).not.toHaveBeenCalled();
});
it('accepts a signed one-click POST and modifies only its user’s marketing field', async () => {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: { id: userId }, error: null }),
  };
  (createAdminClient as jest.Mock).mockReturnValue({ from: () => chain });
  const response = await POST(
    new NextRequest(
      `http://localhost/api/email/unsubscribe?token=${createUnsubscribeToken(userId)}`,
      { method: 'POST', body: 'List-Unsubscribe=One-Click' }
    )
  );
  expect(response.status).toBe(200);
  expect(chain.eq).toHaveBeenCalledWith('id', userId);
  expect(chain.update).toHaveBeenCalledWith({ marketing_unsubscribed_at: expect.any(String) });
});
