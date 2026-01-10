import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';
import { checkSupabaseRateLimit } from '@/libs/rateLimit';
import { isValidUUID } from '@/libs/validation';

/**
 * Block another user. Creates a two-way mirror block preventing messaging and profile viewing.
 * Rate limited to 10 block actions per hour per user.
 * POST /api/users/block
 * Body: { blocked_id: UUID }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Rate limit: 10 block actions per hour per user
    const rateLimitCheck = await checkSupabaseRateLimit(supabase, user.id, 'user-block', {
      maxRequests: 10,
      windowSeconds: 3600,
      message: 'Too many block actions. Please try again later.',
    });

    if (!rateLimitCheck.success) {
      return NextResponse.json(
        { error: rateLimitCheck.error?.message || 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.error?.retryAfter || 3600),
          },
        }
      );
    }

    const { blocked_id } = await request.json();

    if (!blocked_id || typeof blocked_id !== 'string') {
      return NextResponse.json({ error: 'blocked_id is required' }, { status: 400 });
    }

    if (!isValidUUID(blocked_id)) {
      return NextResponse.json({ error: 'Invalid blocked_id format' }, { status: 400 });
    }

    if (blocked_id === user.id) {
      return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });
    }

    // Verify the blocked user exists
    const { data: blockedProfile, error: blockedError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', blocked_id)
      .maybeSingle();

    if (blockedError || !blockedProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create the block
    const { data: block, error: blockError } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: user.id,
        blocked_id: blocked_id,
      })
      .select()
      .single();

    if (blockError) {
      // If it's a unique constraint violation, the user is already blocked
      if (blockError.code === '23505') {
        return NextResponse.json({ error: 'User is already blocked' }, { status: 409 });
      }
      throw blockError;
    }

    return NextResponse.json({ success: true, block }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error blocking user:', error);
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}
