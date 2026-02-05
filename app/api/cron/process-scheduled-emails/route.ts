import { processScheduledEmails } from '@/libs/email';
import { cronAuth } from '@/libs/cronAuth';

/**
 * Cron endpoint: Process scheduled emails
 *
 * PROTECTED: Requires Authorization header with CRON_SECRET
 *
 * Set in Vercel:
 * 1. Environment Variables: CRON_SECRET=your-random-secret
 * 2. In vercel.json crons, add: "headers": { "Authorization": "Bearer <CRON_SECRET>" }
 *
 * Or use Vercel's built-in cron authentication via vercel.json
 */
export const GET = cronAuth(async () => {
  try {
    console.log('[CRON] Starting scheduled email processing...');

    const result = await processScheduledEmails();

    console.log('[CRON] Scheduled email processing completed:', {
      processed: result.processed,
      errors: result.errors.length,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Scheduled emails processed successfully',
      ...result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CRON] Error processing scheduled emails:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process scheduled emails',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// Explicitly block other methods
export async function POST() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
