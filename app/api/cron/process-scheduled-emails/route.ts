import { processScheduledEmails } from '@/libs/email';
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
    console.log('Starting scheduled email processing...');

    const result = await processScheduledEmails();

    console.log('Scheduled email processing completed:', {
      processed: result.processed,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled emails processed successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
    return NextResponse.json(
      {
        error: 'Failed to process scheduled emails',
      },
      { status: 500 }
    );
  }
}
