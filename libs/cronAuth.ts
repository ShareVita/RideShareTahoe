import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication wrapper for cron job endpoints.
 *
 * Vercel Cron: When CRON_SECRET is set in the project, Vercel automatically
 * sends "Authorization: Bearer <CRON_SECRET>" when invoking cron paths.
 *
 * This helper accepts:
 * - Authorization: Bearer <CRON_SECRET> (header) - REQUIRED for production
 * - ?cron_secret=<CRON_SECRET> (query param) - ONLY allowed in development (insecure)
 *
 * Environment variables:
 * - CRON_SECRET: Required in production; used for header auth.
 *
 * Security Note: Query param auth is disabled in production because secrets
 * in URLs appear in logs, browser history, and referrer headers.
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

      // Query param auth: ONLY allowed in development (insecure - appears in logs)
      let queryOk = false;
      if (process.env.NODE_ENV === 'development') {
        const querySecret = request.nextUrl.searchParams.get('cron_secret');
        queryOk = querySecret === vercelCronSecret;
        if (queryOk) {
          console.warn('[CRON] Query param auth used - INSECURE, only use in development!');
        }
      }

      if (!headerOk && !queryOk) {
        console.warn('[CRON] Unauthorized cron access attempt', {
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          path: request.nextUrl.pathname,
          hasQueryParam: !!request.nextUrl.searchParams.get('cron_secret'),
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
