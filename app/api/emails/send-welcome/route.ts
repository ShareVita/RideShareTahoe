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
import { NextResponse } from 'next/server';

export const POST = internalOnly(async (request) => {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        {
          status: 400,
        }
      );
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
      return NextResponse.json(
        { error: 'User not found or missing email' },
        {
          status: 404,
        }
      );
    }

    // Record user login activity
    await recordUserActivity({
      userId,
      event: 'login',
      metadata: { source: 'welcome_email_trigger' },
    });

    // Send welcome email (the sendEmail function should record to email_events)
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
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      {
        status: 500,
      }
    );
  }
});
