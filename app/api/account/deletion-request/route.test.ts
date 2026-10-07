/** @jest-environment node */
import { NextRequest } from 'next/server';
import { DELETE, POST } from './route';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
jest.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
}));
const chain = {
  update: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  (getAuthenticatedUser as jest.Mock).mockResolvedValue({
    user: { id: 'user-1' },
    authError: null,
    supabase: { from: () => chain },
  });
});
it('cancels only the authenticated user’s pending request without rescheduling', async () => {
  chain.maybeSingle.mockResolvedValue({ data: { id: 'request-1' }, error: null });
  const response = await DELETE(
    new NextRequest('http://localhost/api/account/deletion-request', { method: 'DELETE' })
  );
  expect(response.status).toBe(200);
  expect(chain.update).toHaveBeenCalledWith({ status: 'cancelled', processed_at: null });
  expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
  expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
  expect(await response.json()).not.toHaveProperty('newScheduledDate');
});
it('does not report cancellation success after a worker already claimed the request', async () => {
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(
    (
      await DELETE(
        new NextRequest('http://localhost/api/account/deletion-request', { method: 'DELETE' })
      )
    ).status
  ).toBe(404);
});
it('blocks a new request while processing is active', async () => {
  chain.maybeSingle.mockResolvedValue({ data: { status: 'processing' }, error: null });
  const response = await POST(
    new NextRequest('http://localhost/api/account/deletion-request', { method: 'POST', body: '{}' })
  );
  expect(response.status).toBe(400);
  expect(chain.in).toHaveBeenCalledWith('status', ['pending', 'processing']);
});
