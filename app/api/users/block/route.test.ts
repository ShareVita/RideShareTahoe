import type { NextRequest } from 'next/server';
import { POST } from './route';
import { getAuthenticatedUser } from '@/libs/supabase/auth';

jest.mock('@/libs/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(),
}));

jest.mock('@/libs/rateLimit', () => ({
  checkSupabaseRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

describe('POST /api/users/block', () => {
  beforeEach(() => jest.clearAllMocks());

  const validUserId = '123e4567-e89b-12d3-a456-426614174000';
  const validBlockedId = '123e4567-e89b-12d3-a456-426614174001';

  it('creates a block successfully', async () => {
    const user = { id: validUserId };
    const blockedId = validBlockedId;

    const supabase = {
      from: jest.fn((table) => {
        if (table === 'profiles') {
          const maybeSingle = jest.fn().mockResolvedValue({ data: { id: blockedId }, error: null });
          const eq = jest.fn().mockReturnValue({ maybeSingle });
          const select = jest.fn().mockReturnValue({ eq });
          return { select };
        }

        if (table === 'user_blocks') {
          const single = jest.fn().mockResolvedValue({
            data: { id: 'block-1', blocker_id: user.id, blocked_id: blockedId },
            error: null,
          });
          const select = jest.fn().mockReturnValue({ single });
          const insert = jest.fn().mockReturnValue({ select });
          return { insert };
        }

        return { select: jest.fn(), insert: jest.fn() };
      }),
    } as unknown;

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      json: jest.fn().mockResolvedValue({ blocked_id: blockedId }),
    } as unknown as NextRequest;

    const res = await POST(request);

    expect(res.status).toBe(201);
  });

  it('returns 409 when block already exists', async () => {
    const user = { id: validUserId };
    const blockedId = validBlockedId;

    const supabase = {
      from: jest.fn((table) => {
        if (table === 'profiles') {
          const maybeSingle = jest.fn().mockResolvedValue({ data: { id: blockedId }, error: null });
          const eq = jest.fn().mockReturnValue({ maybeSingle });
          const select = jest.fn().mockReturnValue({ eq });
          return { select };
        }

        if (table === 'user_blocks') {
          const select = jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: '23505' } }),
          });
          const insert = jest.fn().mockReturnValue({ select });
          return { insert };
        }

        return { select: jest.fn(), insert: jest.fn() };
      }),
    } as unknown;

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ user, authError: null, supabase });

    const request = {
      json: jest.fn().mockResolvedValue({ blocked_id: blockedId }),
    } as unknown as NextRequest;

    const res = await POST(request);

    expect(res.status).toBe(409);
  });
});
