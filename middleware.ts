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

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. BOT DETECTION
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

  // 2. RATE LIMITING (Basic, per-instance)
  // Apply rate limiting to API routes and expensive public routes
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicRoute = pathname.match(/\/(sitemap\.xml|robots\.txt|rss\.xml)/);

  if (isApiRoute || isPublicRoute) {
    const ip = getClientIp(request.headers);

    // More aggressive limits for public routes that can be hammered
    const limit = isPublicRoute ? 30 : 100; // 30/min for public, 100/min for API
    const windowMs = 60 * 1000; // 1 minute window

    const rateLimitResult = checkRateLimit(`${ip}:${pathname}`, limit, windowMs);

    if (!rateLimitResult.allowed) {
      console.warn('[MIDDLEWARE] Rate limit exceeded', {
        ip,
        path: pathname,
        userAgent,
        retryAfter: rateLimitResult.retryAfter,
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
          }
        }
      );
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
