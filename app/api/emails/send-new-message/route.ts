import { getAppUrl, getUserWithEmail, sendEmail } from '@/libs/email';
import { createClient } from '@/libs/supabase/server';
import { internalOnly } from '@/libs/api/internalOnly';
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';

export const POST = withErrorHandling(
  internalOnly(async (req?: Request | NextRequest) => {
    const nextReq = req as NextRequest;
    try {
      const { recipientId, senderId, messagePreview, messageId, threadId } = await nextReq.json();

      if (!recipientId || !senderId || !messagePreview) {
        return NextResponse.json(
          {
            error: 'Recipient ID, sender ID, and message preview are required',
          },
          { status: 400 }
        );
      }

      // Don't send email to the sender
      if (recipientId === senderId) {
        return NextResponse.json({
          success: true,
          message: 'Skipped - sender and recipient are the same',
        });
      }

      const supabase = await createClient('service_role');

      // Get recipient data with email from user_private_info
      const recipient = await getUserWithEmail(supabase, recipientId);

      if (!recipient || !recipient.email) {
        return NextResponse.json(
          { error: 'Recipient not found or missing email' },
          {
            status: 404,
          }
        );
      }

      // Get sender data (email not needed for sender)
      const { data: sender, error: senderError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', senderId)
        .single();

      if (senderError || !sender) {
        return NextResponse.json(
          { error: 'Sender not found' },
          {
            status: 404,
          }
        );
      }

      // Send new message notification
      await sendEmail({
        userId: recipientId,
        to: recipient.email,
        emailType: 'new_message',
        payload: {
          recipientName: recipient.first_name || '',
          senderName: `${sender.first_name} ${sender.last_name}`.trim(),
          senderInitial: (sender.first_name || 'U')[0].toUpperCase(),
          messagePreview:
            messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
          messageTime: new Date().toLocaleString(),
          messageUrl: `${getAppUrl()}/messages/${messageId}`,
          threadId: threadId || messageId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'New message notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending new message notification:', error);
      return NextResponse.json(
        {
          error: 'Failed to send new message notification',
        },
        { status: 500 }
      );
    }
    // eslint-disable-next-line no-unused-vars
  }) as (request?: Request | NextRequest) => Promise<Response>
);
