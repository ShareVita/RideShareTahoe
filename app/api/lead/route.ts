import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';

// This route is used to store the leads that are generated from the landing page.
// The API call is initiated by <ButtonLead /> component
//
// BOT PROTECTION: Rate limited to prevent spam submissions
export async function POST(req: NextRequest) {
  // 1. RATE LIMITING - Prevent bot spam
  // Using in-memory rate limiting (fast, low-volume endpoint)
  // No need for Upstash overhead (20-50ms) on lead form
  const ip =
    (req as NextRequest & { ip?: string }).ip ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Skip rate limiting if IP unknown (rare edge case)
  if (ip !== 'unknown') {
    // Allow 3 lead submissions per IP per hour (3600 seconds)
    const isAllowed = await rateLimit(ip, 'lead:submit', 3, 3600);

    if (!isAllowed) {
      console.warn('[API] Lead submission rate limit exceeded', { ip });
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  } else {
    console.warn('[API] Lead submission - unknown IP, rate limit skipped');
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
