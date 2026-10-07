import { processScheduledEmails } from '@/libs/email';
import { NextRequest, NextResponse } from 'next/server';
import { rejectUnauthorizedCron } from '@/libs/cronAuth';

export async function GET(request: NextRequest) {
  const rejection = rejectUnauthorizedCron(request);
  if (rejection) return rejection;

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
