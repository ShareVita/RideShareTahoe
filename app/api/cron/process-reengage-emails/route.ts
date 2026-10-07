import { processReengageEmails } from '@/libs/email';
import { NextRequest, NextResponse } from 'next/server';

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
    console.log('Starting re-engagement email processing...');

    const result = await processReengageEmails();

    console.log('Re-engagement email processing completed:', {
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Re-engagement emails processed successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error processing re-engagement emails:', error);
    return NextResponse.json(
      {
        error: 'Failed to process re-engagement emails',
      },
      { status: 500 }
    );
  }
}
