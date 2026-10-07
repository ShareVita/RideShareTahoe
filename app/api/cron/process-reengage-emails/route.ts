import { processReengageEmails } from '@/libs/email';
import { NextRequest, NextResponse } from 'next/server';
import { rejectUnauthorizedCron } from '@/libs/cronAuth';

export async function GET(request: NextRequest) {
  const rejection = rejectUnauthorizedCron(request);
  if (rejection) return rejection;

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
