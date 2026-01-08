import { recordUserActivity, scheduleNurtureEmail, sendEmail } from '@/libs/email';
import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

    const supabase = await createClient();

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
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

    // Send welcome email (idempotent)
    await sendEmail({
      userId,
      to: user.email,
      emailType: 'welcome',
      payload: {
        userName: user.first_name || '',
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharetahoe.com',
      },
    });

    // Schedule nurture email for 3 days later
    await scheduleNurtureEmail(userId);

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
}
