import type { NextRequest } from 'next/server';
import { POST } from './route';
import { getAuthenticatedUser } from '@/libs/supabase/auth';

jest.mock('@/libs/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest
    .fn()
    .mockReturnValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  ensureProfileComplete: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/libs/rateLimit', () => ({
  checkSupabaseRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

describe('POST /api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validUserId = '123e4567-e89b-12d3-a456-426614174000';
  const validRecipientId = '123e4567-e89b-12d3-a456-426614174001';

  it('returns 400 when trying to message yourself', async () => {
    const supabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user: { id: validUserId },
      authError: null,
      supabase,
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        recipient_id: validUserId, // Same as sender
        content: 'Hello!',
      }),
    } as unknown as NextRequest;

    const res = await POST(request);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('You cannot message yourself');
  });

  it('returns 400 for invalid recipient_id format', async () => {
    const supabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user: { id: validUserId },
      authError: null,
      supabase,
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        recipient_id: 'not-a-uuid',
        content: 'Hello!',
      }),
    } as unknown as NextRequest;

    const res = await POST(request);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid recipient_id format');
  });

  it('returns 400 for empty content after trimming', async () => {
    const supabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user: { id: validUserId },
      authError: null,
      supabase,
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        recipient_id: validRecipientId,
        content: '   ', // Only whitespace
      }),
    } as unknown as NextRequest;

    const res = await POST(request);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Message content cannot be empty');
  });

  it('returns 400 for content exceeding max length', async () => {
    const supabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (getAuthenticatedUser as jest.Mock).mockResolvedValue({
      user: { id: validUserId },
      authError: null,
      supabase,
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        recipient_id: validRecipientId,
        content: 'a'.repeat(5001), // Exceeds 5000 char limit
      }),
    } as unknown as NextRequest;

    const res = await POST(request);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Message content cannot exceed 5000 characters');
  });
});
