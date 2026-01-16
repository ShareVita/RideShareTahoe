import { getAppUrl, getUserWithEmail, sendEmail } from '@/libs/email';
import { createClient } from '@/libs/supabase/server';
import { internalOnly } from '@/libs/api/internalOnly';
import { NextResponse } from 'next/server';

export const POST = internalOnly(async (request) => {
  try {
    const { meetingId, userId } = await request.json();

    if (!meetingId || !userId) {
      return NextResponse.json(
        {
          error: 'Meeting ID and User ID are required',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient('service_role');

    // Get meeting details (without email - email is in user_private_info)
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(
        `
        *,
        requester:profiles!meetings_requester_id_fkey(first_name, last_name),
        recipient:profiles!meetings_recipient_id_fkey(first_name, last_name)
      `
      )
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        {
          status: 404,
        }
      );
    }

    // Get user details with email from user_private_info
    const user = await getUserWithEmail(supabase, userId);

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'User not found or missing email' },
        {
          status: 404,
        }
      );
    }

    // Determine if user is requester or recipient
    const isRequester = meeting.requester_id === userId;
    const otherParticipant = isRequester ? meeting.recipient : meeting.requester;
    const meetingTitle = meeting.title || 'RideShare Meeting';

    // Send meeting reminder
    await sendEmail({
      userId,
      to: user.email,
      emailType: 'meeting_reminder',
      payload: {
        userName: user.first_name || '',
        otherParticipantName: `${otherParticipant.first_name} ${otherParticipant.last_name}`.trim(),
        meetingTitle,
        meetingDate: new Date(meeting.starts_at).toLocaleDateString(),
        meetingTime: new Date(meeting.starts_at).toLocaleTimeString(),
        meetingLocation: meeting.location || 'Location TBD',
        meetingUrl: `${getAppUrl()}/meetings/${meetingId}`,
        isRequester,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Meeting reminder sent successfully',
    });
  } catch (error) {
    console.error('Error sending meeting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to send meeting reminder' },
      {
        status: 500,
      }
    );
  }
});
