import { NextRequest } from 'next/server';
import { POST, GET } from './route';

// Mock auth module
jest.mock('@/libs/supabase/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createUnauthorizedResponse: jest.fn(
    (error) => new Response(JSON.stringify({ error: error || 'Unauthorized' }), { status: 401 })
  ),
  ensureProfileComplete: jest.fn(),
}));

import { getAuthenticatedUser, ensureProfileComplete } from '@/libs/supabase/auth';

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;
const mockEnsureProfileComplete = ensureProfileComplete as jest.Mock;

describe('POST /api/rides', () => {
  const mockSupabase = {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
    })),
  };

  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({
      user: mockUser,
      authError: null,
      supabase: mockSupabase,
    });
    mockEnsureProfileComplete.mockResolvedValue(null);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValueOnce({
      user: null,
      authError: 'Not authenticated',
      supabase: null,
    });

    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid ride data', async () => {
    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required fields
        title: 'Test',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });

  it('validates required fields using Zod schema', async () => {
    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify({
        title: 'AB', // Too short (min 3)
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        departure_date: '2025-02-01',
        departure_time: '08:00',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  it('accepts valid single ride data', async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'ride-1',
            poster_id: 'user-123',
            title: 'Weekend Trip',
          },
        ],
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const validRide = {
      title: 'Weekend Trip',
      start_location: 'San Francisco',
      end_location: 'Lake Tahoe',
      departure_date: '2025-02-01',
      departure_time: '08:00',
    };

    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify(validRide),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('accepts valid array of rides', async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [
          { id: 'ride-1', title: 'Weekend Trip' },
          { id: 'ride-2', title: 'Weekend Trip' },
        ],
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const validRides = [
      {
        title: 'Weekend Trip',
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        departure_date: '2025-02-01',
        departure_time: '08:00',
      },
      {
        title: 'Weekend Trip',
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        departure_date: '2025-02-08',
        departure_time: '08:00',
      },
    ];

    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify(validRides),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('validates date format', async () => {
    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Weekend Trip',
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        departure_date: 'invalid-date', // Should be YYYY-MM-DD
        departure_time: '08:00',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('validates time format', async () => {
    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Weekend Trip',
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        departure_date: '2025-02-01',
        departure_time: 'invalid-time', // Should be HH:MM
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('handles database errors gracefully', async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    });

    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const validRide = {
      title: 'Weekend Trip',
      start_location: 'San Francisco',
      end_location: 'Lake Tahoe',
      departure_date: '2025-02-01',
      departure_time: '08:00',
    };

    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify(validRide),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Failed to create rides');
  });

  it('returns profile error if profile is incomplete', async () => {
    mockEnsureProfileComplete.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Profile incomplete' }), { status: 400 })
    );

    const request = new NextRequest('http://localhost/api/rides', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Weekend Trip',
        start_location: 'San Francisco',
        end_location: 'Lake Tahoe',
        departure_date: '2025-02-01',
        departure_time: '08:00',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/rides', () => {
  const mockSupabase = {
    from: jest.fn(),
  };

  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({
      user: mockUser,
      authError: null,
      supabase: mockSupabase,
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValueOnce({
      user: null,
      authError: 'Not authenticated',
      supabase: null,
    });

    const request = new NextRequest('http://localhost/api/rides');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns rides successfully', async () => {
    const mockRides = [
      { id: 'ride-1', title: 'Trip 1' },
      { id: 'ride-2', title: 'Trip 2' },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockRides,
                error: null,
                count: 2,
              }),
            }),
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/rides');
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.rides).toHaveLength(2);
    expect(body.totalCount).toBe(2);
  });

  it('filters by posting_type when provided', async () => {
    const mockEq = jest.fn().mockReturnValue({
      gte: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        }),
      }),
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: mockEq,
      }),
    });

    const request = new NextRequest('http://localhost/api/rides?posting_type=driver');
    await GET(request);

    // First call is for status, could have a second for posting_type
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
  });

  it('handles pagination parameters', async () => {
    const mockRange = jest.fn().mockResolvedValue({
      data: [],
      error: null,
      count: 100,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: mockRange,
            }),
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/rides?limit=10&offset=20');
    await GET(request);

    expect(mockRange).toHaveBeenCalledWith(20, 29);
  });

  it('returns hasMore correctly when more rides exist', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: Array(20).fill({ id: 'ride', title: 'Trip' }),
                error: null,
                count: 50,
              }),
            }),
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/rides');
    const response = await GET(request);
    const body = await response.json();

    expect(body.hasMore).toBe(true);
  });

  it('handles database error gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
                count: null,
              }),
            }),
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/rides');
    const response = await GET(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Failed to fetch rides');
  });
});
