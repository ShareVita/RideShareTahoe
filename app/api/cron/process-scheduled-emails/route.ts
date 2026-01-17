import { processScheduledEmails } from '@/libs/email';
import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';

export const GET = withErrorHandling(async () => {
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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
