import { NextRequest, NextResponse } from 'next/server';
import { processScheduledDeletions } from '@/lib/accountDeletion';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET_TOKEN;
  if (!secret) {
    return NextResponse.json(
      { error: 'Scheduler authorization is not configured' },
      { status: 503 }
    );
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
