import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { unsubscribeMarketing, verifyUnsubscribeToken } from '@/libs/email/preferences';

// GET never changes preferences: email scanners can safely follow the confirmation link.
export async function POST(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    const userId = verifyUnsubscribeToken(token);
    if (!userId) return NextResponse.json({ error: 'Invalid unsubscribe link' }, { status: 400 });
    await unsubscribeMarketing(createAdminClient(), userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Unable to save your preference. Please try again later.' },
      { status: 503 }
    );
  }
}
