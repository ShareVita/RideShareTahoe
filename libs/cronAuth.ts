import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication wrapper for cron job endpoints.
 *
 * Vercel Cron jobs can be protected with:
 * 1. Vercel's own Authorization header (vercel.json cron secret)
 * 2. Custom CRON_SECRET environment variable
 *
 * Usage:
 * ```typescript
 * import { cronAuth } from '@/libs/cronAuth';
 *
 * export const GET = cronAuth(async (request) => {
 *   // Your cron logic here
 * });
 * ```
 *
 * Environment variables:
 * - CRON_SECRET: Your custom secret for cron endpoints
 */

// eslint-disable-next-line no-unused-vars
type RouteHandler = (request: NextRequest) => Promise<NextResponse | Response>;

export function cronAuth(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest): Promise<NextResponse | Response> => {
    // Check for Vercel Cron secret (sent by Vercel's cron system)
    const authHeader = request.headers.get('authorization');
    const vercelCronSecret = process.env.CRON_SECRET;

    if (!vercelCronSecret) {
      console.warn('[CRON] CRON_SECRET not configured - cron routes are unprotected!');
      // In development or if not configured, allow through with warning
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'CRON_SECRET not configured' },
          { status: 500 }
        );
      }
    } else {
      // Check authorization header
      const expectedAuth = `Bearer ${vercelCronSecret}`;
      if (authHeader !== expectedAuth) {
        console.warn('[CRON] Unauthorized cron access attempt', {
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          path: request.nextUrl.pathname,
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Verify it's a GET request (cron jobs should be GET)
    if (request.method !== 'GET') {
      return NextResponse.json(
        { error: 'Method not allowed. Cron endpoints only accept GET.' },
        { status: 405 }
      );
    }

    return handler(request);
  };
}
