/**
 * Next.js Middleware - Bot Storm Protection
 *
 * This middleware runs on EVERY request before reaching your API routes.
 * It provides:
 * 1. Bot detection and blocking
 * 2. Basic rate limiting (per-instance, resets on cold start)
 * 3. Supabase auth session refresh
 *
 * IMPORTANT: Keep this lightweight! Heavy operations should be in API routes.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getCookieOptions } from '@/libs/cookieOptions';
import { isMaliciousBot, getClientIp } from '@/libs/botDetection';
import { checkRateLimit } from '@/libs/middlewareRateLimit';

/**
 * Group routes by feature area to prevent rate limit bypass via route switching.
 * A bot hitting different routes in the same group will share the rate limit.
 */
function getRouteGroup(pathname: string): string {
  // Public routes (sitemap, robots, rss)
  if (pathname.match(/\/(sitemap\.xml|robots\.txt|rss\.xml)/)) {
    return 'public';
  }

  // API route grouping
  if (pathname.startsWith('/api/community/')) return 'community';
  if (pathname.startsWith('/api/reviews/')) return 'reviews';
  if (pathname.startsWith('/api/trips/')) return 'trips';
  if (pathname.startsWith('/api/messages')) return 'messages';
  if (pathname.startsWith('/api/matches')) return 'matches';
  if (pathname.startsWith('/api/admin/')) return 'admin';
  if (pathname.startsWith('/api/cron/')) return 'cron';

  // Default for ungrouped routes
  return 'other';
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets: Skip all processing (no session refresh needed)
  const isStaticAsset = pathname.match(/\/_next|\/favicon\.ico|\/.*\.(svg|png|jpg|jpeg|gif|webp)$/);
  if (isStaticAsset) {
    return NextResponse.next({ request });
  }

  // Auth routes: Skip bot detection and rate limiting, but DO refresh session
  const isAuthRoute = pathname.startsWith('/api/auth/');
  if (isAuthRoute) {
    // Skip to session refresh at bottom (lines 95-126)
    // Don't return early - let session refresh happen
  }

  // 1. BOT DETECTION (skip for auth routes)
  if (!isAuthRoute) {
    const userAgent = request.headers.get('user-agent');

    // Block malicious bots early
    if (isMaliciousBot(userAgent)) {
      console.warn('[MIDDLEWARE] Blocked malicious bot', {
        ip: getClientIp(request.headers),
        userAgent,
        path: pathname,
      });
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: { 'X-Blocked-Reason': 'malicious-bot' } }
      );
    }
  }

  // 2. RATE LIMITING (skip for auth routes)
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicRoute = pathname.match(/\/(sitemap\.xml|robots\.txt|rss\.xml)/);

  if (!isAuthRoute && (isApiRoute || isPublicRoute)) {
    // Prefer Vercel-provided ip when available (request.ip in middleware), else headers
    const ip = (request as NextRequest & { ip?: string }).ip || getClientIp(request.headers);

    // If IP is unknown, allow but log (don't block everyone)
    if (!ip || ip === 'unknown') {
      console.warn('[MIDDLEWARE] Rate limit skipped - unknown IP', { path: pathname });
      // Continue without rate limiting to avoid blocking all users
    } else {
      // FEATURE FLAG: Use grouped rate limiting to prevent route-switching bypass
      const useGroupedLimits = process.env.USE_GROUPED_RATE_LIMITS === 'true';

      let rateLimitKey: string;
      let limit: number;
      const windowMs = 60 * 1000; // 1 minute window

      if (useGroupedLimits) {
        // Smart grouping: Group routes by feature area to prevent bypass
        const routeGroup = getRouteGroup(pathname);
        rateLimitKey = `${ip}:api:${routeGroup}`;

        // Limits per group (customize based on route expense)
        const groupLimits: Record<string, number> = {
          community: 100, // Discovery/search endpoints
          reviews: 60, // Review operations
          trips: 80, // Booking operations
          messages: 100, // Messaging
          matches: 20, // Expensive distance calculations
          admin: 30, // Admin operations
          public: 30, // Public routes (sitemap, robots, rss)
          other: 100, // Default for ungrouped routes
        };

        limit = groupLimits[routeGroup] || 100;

        console.log('[MIDDLEWARE] Using grouped rate limits', {
          ip,
          pathname,
          routeGroup,
          limit,
        });
      } else {
        // Legacy: Per-route rate limiting (vulnerable to bypass)
        rateLimitKey = `${ip}:${pathname}`;
        limit = isPublicRoute ? 30 : 100;
      }

      const rateLimitResult = await checkRateLimit(rateLimitKey, limit, windowMs);

      if (!rateLimitResult.allowed) {
        console.warn('[MIDDLEWARE] Rate limit exceeded', {
          ip,
          path: pathname,
          userAgent: request.headers.get('user-agent'),
          retryAfter: rateLimitResult.retryAfter,
          grouped: useGroupedLimits,
        });

        return NextResponse.json(
          {
            error: 'Too many requests. Please slow down.',
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimitResult.retryAfter || 60),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }
    }
  }

  // 3. SUPABASE SESSION REFRESH
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: getCookieOptions() as CookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - Static assets (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
