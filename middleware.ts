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
 * Parse allowed origins once at module load for performance.
 * Supports comma-separated ALLOWED_ORIGINS or fallback to NEXT_PUBLIC_APP_URL.
 */
const ALLOWED_ORIGINS = (() => {
  const origins: string[] = [];

  // Support comma-separated list of origins
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(
      ...process.env.ALLOWED_ORIGINS.split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    );
  }
  // Fallback to NEXT_PUBLIC_APP_URL
  else if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // In development, always allow localhost
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://localhost:3001');
  }

  // Parse to origins (just the protocol + host) for fast string comparison
  return origins.map((url) => {
    try {
      return new URL(url).origin;
    } catch {
      return url; // Keep as-is if not a valid URL
    }
  });
})();

/**
 * Check if a route requires Supabase session management.
 * Only these routes will have session refresh in middleware.
 */
function requiresAuth(pathname: string): boolean {
  // Auth routes always need session
  if (pathname.startsWith('/api/auth/')) return true;

  // Protected API routes that require authentication
  const protectedPrefixes = [
    '/api/profile/',
    '/api/messages',
    '/api/matches',
    '/api/users/',
    '/api/account/',
    '/api/admin/',
    '/api/trips/',
    '/api/reviews/',
    '/dashboard',
    '/profile',
  ];

  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

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

  // 1. CSRF PROTECTION (for API routes with mutating methods)
  const isMutatingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
  const isApiRoute = pathname.startsWith('/api/');

  if (!isAuthRoute && isApiRoute && isMutatingRequest) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const hasApiAuth = request.headers.get('authorization')?.startsWith('Bearer ');

    // Check origin header (preferred for CORS requests)
    if (origin) {
      const isAllowed = ALLOWED_ORIGINS.includes(origin);

      if (!isAllowed && ALLOWED_ORIGINS.length > 0) {
        console.warn('[MIDDLEWARE] Blocked CSRF attempt - invalid origin', {
          origin,
          path: pathname,
          ip: getClientIp(request.headers),
          allowedOrigins: ALLOWED_ORIGINS,
        });
        return NextResponse.json(
          { error: 'Forbidden - Invalid origin' },
          { status: 403, headers: { 'X-Blocked-Reason': 'csrf-invalid-origin' } }
        );
      }
    }
    // Check referer as fallback (for same-site requests)
    else if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        const isAllowed = ALLOWED_ORIGINS.includes(refererOrigin);

        if (!isAllowed && ALLOWED_ORIGINS.length > 0) {
          console.warn('[MIDDLEWARE] Blocked CSRF attempt - invalid referer', {
            referer,
            refererOrigin,
            path: pathname,
            ip: getClientIp(request.headers),
            allowedOrigins: ALLOWED_ORIGINS,
          });
          return NextResponse.json(
            { error: 'Forbidden - Invalid referer' },
            { status: 403, headers: { 'X-Blocked-Reason': 'csrf-invalid-referer' } }
          );
        }
      } catch {
        // Invalid referer URL format
        console.warn('[MIDDLEWARE] Invalid referer URL format', { referer, path: pathname });
        return NextResponse.json(
          { error: 'Forbidden - Invalid referer format' },
          { status: 403, headers: { 'X-Blocked-Reason': 'csrf-invalid-referer-format' } }
        );
      }
    }
    // No origin or referer - ONLY allow if authenticated with API key
    else {
      if (!hasApiAuth) {
        // Browser requests MUST have origin or referer for CSRF protection
        console.warn('[MIDDLEWARE] Blocked CSRF attempt - missing origin/referer', {
          path: pathname,
          method: request.method,
          userAgent: request.headers.get('user-agent'),
          ip: getClientIp(request.headers),
        });
        return NextResponse.json(
          { error: 'Forbidden - CSRF protection requires Origin or Referer header' },
          { status: 403, headers: { 'X-Blocked-Reason': 'csrf-missing-headers' } }
        );
      }
      // Has API auth - allow (e.g., server-to-server webhooks)
      console.log('[MIDDLEWARE] Allowing authenticated API request without origin/referer', {
        path: pathname,
      });
    }
  }

  // 2. BOT DETECTION (skip for auth routes)
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

  // 3. RATE LIMITING (skip for auth routes)
  const isPublicRoute = pathname.match(/\/(sitemap\.xml|robots\.txt|rss\.xml)/);

  if (!isAuthRoute && (isApiRoute || isPublicRoute)) {
    // Prefer Vercel-provided ip when available (request.ip in middleware), else headers
    const ip = (request as NextRequest & { ip?: string }).ip || getClientIp(request.headers);

    // If IP is unknown, skip rate limiting (rare edge case, better than false positives)
    if (!ip || ip === 'unknown') {
      console.error('[MIDDLEWARE] Unknown IP detected - rate limiting skipped', {
        path: pathname,
        userAgent: request.headers.get('user-agent'),
        note: 'Set up monitoring/alerting for this - indicates infrastructure issue',
      });
      // Skip rate limiting rather than using unreliable fingerprinting
      // This is a rare edge case (Vercel infrastructure issue)
    } else {
      // Use grouped rate limiting to prevent route-switching bypass
      // Routes are grouped by feature area to share rate limits
      const routeGroup = getRouteGroup(pathname);
      const rateLimitKey = `${ip}:api:${routeGroup}`;
      const windowMs = 60 * 1000; // 1 minute window

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

      const limit = groupLimits[routeGroup] || 100;

      const rateLimitResult = await checkRateLimit(rateLimitKey, limit, windowMs);

      if (!rateLimitResult.allowed) {
        console.warn('[MIDDLEWARE] Rate limit exceeded', {
          ip,
          path: pathname,
          routeGroup,
          userAgent: request.headers.get('user-agent'),
          retryAfter: rateLimitResult.retryAfter,
          limit,
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

  // 4. SUPABASE SESSION REFRESH (only for routes that need auth)
  // Skip for public routes to improve performance (15-30ms savings per request)
  if (requiresAuth(pathname)) {
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

  // For public routes, just pass through
  return NextResponse.next({ request });
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
