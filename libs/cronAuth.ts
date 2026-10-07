import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Scheduler authorization for `/api/cron/*` routes.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Other schedulers use
 * `CRON_SECRET_TOKEN`. Either is accepted. With neither configured the routes
 * fail closed. Comparison hashes both sides first so it is constant-time and
 * does not leak the secret's length.
 *
 * Returns the response to send when the request is not authorized, or `null`
 * when the caller may proceed.
 */
export function rejectUnauthorizedCron(request: NextRequest): NextResponse | null {
  const secrets = [process.env.CRON_SECRET, process.env.CRON_SECRET_TOKEN].filter(
    (secret): secret is string => Boolean(secret)
  );
  if (secrets.length === 0) {
    return NextResponse.json(
      { error: 'Scheduler authorization is not configured' },
      { status: 503 }
    );
  }

  const presented = request.headers.get('authorization') ?? '';
  const authorized = secrets.some((secret) => sameDigest(presented, `Bearer ${secret}`));
  return authorized ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function sameDigest(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
