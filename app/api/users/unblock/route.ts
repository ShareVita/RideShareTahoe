import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';
import { checkSupabaseRateLimit } from '@/libs/rateLimit';
import { isValidUUID } from '@/libs/validation';

/**
 * Unblock another user. Removes the two-way mirror block.
 * Rate limited to 10 unblock actions per hour per user.
 * POST /api/users/unblock
 * Body: { blocked_id: UUID }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Rate limit: 10 unblock actions per hour per user
    const rateLimitCheck = await checkSupabaseRateLimit(supabase, user.id, 'user-unblock', {
      maxRequests: 10,
      windowSeconds: 3600,
      message: 'Too many unblock actions. Please try again later.',
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

    // Delete the block record and check if it existed
    const { data: deletedRows, error: deleteError } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blocked_id)
      .select();

    if (deleteError) {
      throw deleteError;
    }

    // Return 200 for idempotency - unblock succeeds whether or not block existed
    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ success: true, message: 'User was not blocked' }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: 'User unblocked' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error unblocking user:', error);
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}
