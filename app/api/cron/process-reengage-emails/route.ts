import { processReengageEmails } from '@/libs/email';
import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';

export const GET = withErrorHandling(async () => {
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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
