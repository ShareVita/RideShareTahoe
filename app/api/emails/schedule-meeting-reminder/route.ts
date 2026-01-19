import { scheduleMeetingReminder } from '@/libs/email';
import { createClient } from '@/libs/supabase/server';
import { internalOnly } from '@/libs/api/internalOnly';
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';

export const POST = withErrorHandling(
  internalOnly(async (req?: Request | NextRequest) => {
    const nextReq = req as NextRequest;
    try {
      const { userId, meetingId, meetingTitle, startsAt } = await nextReq.json();

      if (!userId || !meetingId || !meetingTitle || !startsAt) {
        return NextResponse.json(
          {
            error: 'User ID, meeting ID, meeting title, and start time are required',
          },
          { status: 400 }
        );
      }

      const supabase = await createClient('service_role');

      // Verify meeting exists and user has access
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id, requester_id, recipient_id, title, start_datetime')
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

      // Check if user is involved in the meeting
      if (meeting.requester_id !== userId && meeting.recipient_id !== userId) {
        return NextResponse.json(
          {
            error: 'User not authorized for this meeting',
          },
          { status: 403 }
        );
      }

      // Schedule meeting reminder (1 day before)
      await scheduleMeetingReminder({
        userId,
        meetingId,
        meetingTitle: meetingTitle,
        startsAt: new Date(startsAt),
        payload: {
          meetingId,
          title: meetingTitle,
          startsAt: new Date(startsAt).toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Meeting reminder scheduled successfully',
      });
    } catch (error) {
      console.error('Error scheduling meeting reminder:', error);
      return NextResponse.json(
        {
          error: 'Failed to schedule meeting reminder',
        },
        { status: 500 }
      );
    }
    // eslint-disable-next-line no-unused-vars
  }) as (request?: Request | NextRequest) => Promise<Response>
);
