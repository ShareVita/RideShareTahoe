import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication wrapper for cron job endpoints.
 *
 * Vercel Cron: When CRON_SECRET is set in the project, Vercel automatically
 * sends "Authorization: Bearer <CRON_SECRET>" when invoking cron paths.
 *
 * This helper also accepts:
 * - Authorization: Bearer <CRON_SECRET> (header)
 * - ?cron_secret=<CRON_SECRET> (query param, for manual triggers or if headers are not sent)
 *
 * Environment variables:
 * - CRON_SECRET: Required in production; used for both header and query auth.
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
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
      }
    } else {
      const expectedAuth = `Bearer ${vercelCronSecret}`;
      const headerOk = authHeader === expectedAuth;
      const querySecret = request.nextUrl.searchParams.get('cron_secret');
      const queryOk = querySecret === vercelCronSecret;
      if (!headerOk && !queryOk) {
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
