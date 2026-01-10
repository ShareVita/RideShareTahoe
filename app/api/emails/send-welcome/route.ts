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

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    // Get user email from private info table
    const { data: privateInfo, error: privateError } = await supabase
      .from('user_private_info')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || privateError || !profile || !privateInfo?.email) {
      console.error('User data fetch error:', { profileError, privateError, profile, privateInfo });
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

    // Send welcome email (idempotent)
    await sendEmail({
      userId,
      to: privateInfo.email,
      emailType: 'welcome',
      payload: {
        userName: profile.first_name || '',
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
