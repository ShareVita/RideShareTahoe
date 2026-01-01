import type { NextRequest } from 'next/server';
import { POST } from './route';
import { getAuthenticatedUser } from '@/libs/supabase/auth';

jest.mock('@/libs/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
}));

describe('POST /api/users/unblock', () => {
  beforeEach(() => jest.clearAllMocks());

  const validUserId = '123e4567-e89b-12d3-a456-426614174000';
  const validBlockedId = '123e4567-e89b-12d3-a456-426614174001';

  it('removes an existing block', async () => {
    const user = { id: validUserId };
    const blockedId = validBlockedId;

    const mockFrom = jest.fn((table) => {
      if (table === 'user_blocks') {
        const eq2 = jest.fn().mockResolvedValue({ data: { id: 'block-1' }, error: null });
        const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
        const del = jest.fn().mockReturnValue({ eq: eq1 });
        return { delete: del };
      }

      return { delete: jest.fn() };
    });

    const supabase = { from: mockFrom };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      json: jest.fn().mockResolvedValue({ blocked_id: blockedId }),
    } as unknown as NextRequest;

    const res = await POST(request);

    expect(mockFrom).toHaveBeenCalledWith('user_blocks');
    expect(res.status).toBe(200);
  });

  it('is idempotent when no block exists', async () => {
    const user = { id: validUserId };
    const blockedId = validBlockedId;

    const supabase = {
      from: jest.fn((table) => {
        if (table === 'user_blocks') {
          const eq2 = jest.fn().mockResolvedValue({ data: null, error: null });
          const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
          const del = jest.fn().mockReturnValue({ eq: eq1 });
          return { delete: del };
        }

        return { delete: jest.fn() };
      }),
    } as unknown;

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      json: jest.fn().mockResolvedValue({ blocked_id: blockedId }),
    } as unknown as NextRequest;

    const res = await POST(request);

    expect(res.status).toBe(200);
  });
});
