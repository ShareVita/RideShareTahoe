import { NextRequest, NextResponse } from 'next/server';

/**
 * Wrapper for internal-only API routes that require the x-internal-api-key header.
 * Use this for routes that should only be called by other server-side code, not by clients.
 *
 * Usage:
 * ```typescript
 * import { internalOnly } from '@/libs/api/internalOnly';
 *
 * export const POST = internalOnly(async (request) => {
 *   // Your route logic here
 * });
 * ```
 */
// eslint-disable-next-line no-unused-vars
type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export function internalOnly(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest): Promise<NextResponse> => {
    const apiKey = request.headers.get('x-internal-api-key');
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(request);
  };
}
