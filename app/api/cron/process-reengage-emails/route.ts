import { processReengageEmails } from '@/libs/email';
import { NextRequest } from 'next/server';
import { cronAuth } from '@/libs/cronAuth';

/**
 * Cron endpoint: Process re-engagement emails
 *
 * PROTECTED: Requires Authorization header with CRON_SECRET
 *
 * Set in Vercel:
 * 1. Environment Variables: CRON_SECRET=your-random-secret
 * 2. In vercel.json crons, add: "headers": { "Authorization": "Bearer <CRON_SECRET>" }
 *
 * Or use Vercel's built-in cron authentication via vercel.json
 */
export const GET = cronAuth(async (_request: NextRequest) => {
  try {
    console.log('[CRON] Starting re-engagement email processing...');

    const result = await processReengageEmails();

    console.log('[CRON] Re-engagement email processing completed:', {
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Re-engagement emails processed successfully',
      ...result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CRON] Error processing re-engagement emails:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process re-engagement emails',
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
