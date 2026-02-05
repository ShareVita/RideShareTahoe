import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/libs/middlewareRateLimit';
import { generateRequestFingerprint } from '@/libs/botDetection';

// This route is used to store the leads that are generated from the landing page.
// The API call is initiated by <ButtonLead /> component
//
// BOT PROTECTION: Rate limited to prevent spam submissions
export async function POST(req: NextRequest) {
  // 1. RATE LIMITING - Prevent bot spam
  let ip =
    (req as NextRequest & { ip?: string }).ip ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // If IP is unknown, use request fingerprinting as fallback
  if (ip === 'unknown') {
    ip = generateRequestFingerprint(req.headers);
    console.warn('[API] Lead submission - unknown IP, using fingerprint', { fingerprint: ip });
  }

  // Allow 3 lead submissions per IP/fingerprint per hour (3600000ms = 1 hour)
  const rateLimitResult = await checkRateLimit(`${ip}:lead:submit`, 3, 3600000);

  if (!rateLimitResult.allowed) {
    console.warn('[API] Lead submission rate limit exceeded', { identifier: ip });
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 3600),
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // 2. REQUEST VALIDATION
  const body = await req.json();

  if (!body.email) {
    return NextResponse.json(
      { error: 'Email is required' },
      {
        status: 400,
      }
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  try {
    // Here you can add your own logic
    // For instance, sending a welcome email (use the the sendEmail helper function from /libs/resend)
    // For instance, saving the lead in the database (uncomment the code below)

    return NextResponse.json({});
  } catch (e: unknown) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Block all other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
