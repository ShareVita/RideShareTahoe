import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';

/**
 * Sends a new message between users.
 * Requires an active booking/ride context between the sender and recipient.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const { recipient_id, content, ride_post_id } = await request.json();

    if (!recipient_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        {
          status: 400,
        }
      );
    }

    // Verify users have an active booking together
    const { data: booking, error: bookingError } = await supabase
      .from('trip_bookings')
      .select('id, status')
      .or(
        `and(driver_id.eq.${user.id},passenger_id.eq.${recipient_id}),and(driver_id.eq.${recipient_id},passenger_id.eq.${user.id})`
      )
      .in('status', ['pending', 'confirmed', 'invited'])
      .maybeSingle();

    if (bookingError) {
      console.error('Error checking booking:', bookingError);
    }

    if (!booking) {
      return NextResponse.json(
        { error: 'You must have a pending or scheduled ride with this user to message them' },
        {
          status: 403,
        }
      );
    }

    let query = supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${recipient_id}),and(participant1_id.eq.${recipient_id},participant2_id.eq.${user.id})`
      );

    if (ride_post_id) {
      query = query.eq('ride_id', ride_post_id);
    } else {
      query = query.is('ride_id', null);
    }

    const { data: existingConversation } = await query.maybeSingle();

    let conversationId;

    if (existingConversation) {
      conversationId = existingConversation.id;

      // Update the last_message_at timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    } else {
      // Create a new conversation
      const { data: newConversation, error: newConvError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: recipient_id,
          ride_id: ride_post_id || null,
        })
        .select()
        .single();

      if (newConvError) throw newConvError;
      conversationId = newConversation.id;
    }

    // Send the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipient_id,
        ride_id: ride_post_id || null,
        conversation_id: conversationId,
        subject: null,
        content: content,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Send email notification to recipient using centralized email system
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/send-new-message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: recipient_id,
            senderId: user.id,
            messagePreview: content.substring(0, 100),
            messageId: message.id,
            threadId: conversationId,
          }),
        }
      );
    } catch (emailError: unknown) {
      console.error('Error sending message notification email:', emailError);
      // Don't fail the message creation if email fails
    }

    return NextResponse.json({
      success: true,
      message: message,
      conversation_id: conversationId,
    });
  } catch (error: unknown) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      {
        status: 500,
      }
    );
  }
}

/**
 * Retrieves messages for a specific conversation.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        {
          status: 400,
        }
      );
    }

    // Fetch messages for the conversation
    const { data: messages, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        sender:profiles!messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      {
        status: 500,
      }
    );
  }
}
