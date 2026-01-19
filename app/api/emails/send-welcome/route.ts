import {
  getAppUrl,
  getUserWithEmail,
  recordUserActivity,
  sanitizeForLog,
  scheduleNurtureEmail,
  sendEmail,
} from '@/libs/email';
import { createClient } from '@/libs/supabase/server';
import { internalOnly } from '@/libs/api/internalOnly';
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';

/**
 * POST route to send a welcome email for a user.
 *
 * Expects JSON body: { userId: string }
 */
export const POST = withErrorHandling(
  internalOnly(async (req?: Request | NextRequest) => {
    // internalOnly guarantees this is a NextRequest at runtime; narrow the type for TS
    const nextReq = req as NextRequest;

    const { userId } = await nextReq.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = await createClient('service_role');

    // Check if welcome email was already sent (idempotent check)
    const { data: existingWelcomeEmail } = await supabase
      .from('email_events')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'welcome')
      .maybeSingle();

    if (existingWelcomeEmail) {
      console.log(`Welcome email already sent to user ${sanitizeForLog(userId)}, skipping`);
      return NextResponse.json({
        success: true,
        message: 'Welcome email already sent (skipped duplicate)',
        skipped: true,
      });
    }

    // Get user data with email from user_private_info
    const user = await getUserWithEmail(supabase, userId);

    if (!user || !user.email) {
      return NextResponse.json({ error: 'User not found or missing email' }, { status: 404 });
    }

    // Record user login activity
    await recordUserActivity({
      userId,
      event: 'login',
      metadata: { source: 'welcome_email_trigger' },
    });

    // Send welcome email
    await sendEmail({
      userId,
      to: user.email,
      emailType: 'welcome',
      payload: {
        userName: user.first_name || '',
        appUrl: getAppUrl(),
      },
    });

    // Schedule nurture email for 3 days later
    await scheduleNurtureEmail(userId);

    console.log(`✅ Welcome email sent to user ${sanitizeForLog(userId)}`);

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent and nurture email scheduled',
    });
    // eslint-disable-next-line no-unused-vars
  }) as (request?: Request | NextRequest) => Promise<Response>
);
