import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';
import { isValidUUID } from '@/libs/validation';

/**
 * Unblock another user. Removes the two-way mirror block.
 * POST /api/users/unblock
 * Body: { blocked_id: UUID }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const { blocked_id } = await request.json();

    if (!blocked_id || typeof blocked_id !== 'string') {
      return NextResponse.json({ error: 'blocked_id is required' }, { status: 400 });
    }

    if (!isValidUUID(blocked_id)) {
      return NextResponse.json({ error: 'Invalid blocked_id format' }, { status: 400 });
    }

    // Delete the block record
    const { error: deleteError } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blocked_id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: 'User unblocked' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error unblocking user:', error);
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}
