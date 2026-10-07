import { NextRequest, NextResponse } from 'next/server';
import { processScheduledDeletions } from '@/lib/accountDeletion';
import { rejectUnauthorizedCron } from '@/libs/cronAuth';

export async function GET(request: NextRequest) {
  const rejection = rejectUnauthorizedCron(request);
  if (rejection) return rejection;
  if (process.env.ACCOUNT_DELETION_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Account deletion is disabled' }, { status: 503 });
  }

  try {
    const result = await processScheduledDeletions();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error processing scheduled deletions:', error);
    return NextResponse.json({ error: 'Failed to process deletion requests' }, { status: 500 });
  }
}

// Support the existing external scheduler's POST and Vercel-style GET.
export const POST = GET;
