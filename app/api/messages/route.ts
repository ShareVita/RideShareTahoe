import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  ensureProfileComplete,
} from '@/libs/supabase/auth';
import { checkSupabaseRateLimit } from '@/libs/rateLimit';
import { isValidUUID } from '@/libs/validation';

const MAX_MESSAGE_LENGTH = 5000;

/**
 * Sends a new message between authenticated users.
 * Rate limited to 20 messages per hour per user.
 * Users must have a complete profile (first_name) to send messages.
 * RLS policies enforce that users are not blocked from messaging each other.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Check profile completion first - don't consume rate limit for incomplete profiles
    const profileError = await ensureProfileComplete(supabase, user.id, 'sending messages');
    if (profileError) return profileError;

    // Check rate limit (20 messages per hour per user)
    // Uses database-backed rate limiting for serverless compatibility
    const rateLimitCheck = await checkSupabaseRateLimit(supabase, user.id, 'messages', {
      maxRequests: 20,
      windowSeconds: 3600,
      message: 'You have sent too many messages. Please try again later.',
    });

    if (!rateLimitCheck.success) {
      return NextResponse.json(
        { error: rateLimitCheck.error?.message || 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.error?.retryAfter || 3600),
          },
        }
      );
    }

    const { recipient_id, content, ride_post_id } = await request.json();

    if (!recipient_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate UUID format to prevent injection
    if (!isValidUUID(recipient_id)) {
      return NextResponse.json({ error: 'Invalid recipient_id format' }, { status: 400 });
    }

    // Prevent self-messaging
    if (recipient_id === user.id) {
      return NextResponse.json({ error: 'You cannot message yourself' }, { status: 400 });
    }

    if (ride_post_id && !isValidUUID(ride_post_id)) {
      return NextResponse.json({ error: 'Invalid ride_post_id format' }, { status: 400 });
    }

    // Validate content - check raw length first to prevent DoS with large payloads
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Message content must be a string' }, { status: 400 });
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message content cannot exceed ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    // Find existing conversation with optimized query
    // Check both orderings: (user, recipient) or (recipient, user) AND filter by ride_id
    let conversationQuery = supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${recipient_id}),and(participant1_id.eq.${recipient_id},participant2_id.eq.${user.id})`
      );

    // Add ride_id filter at the database level for efficiency
    if (ride_post_id) {
      conversationQuery = conversationQuery.eq('ride_id', ride_post_id);
    } else {
      conversationQuery = conversationQuery.is('ride_id', null);
    }

    const { data: existingConversation } = await conversationQuery.maybeSingle();

    let conversationId;

    if (existingConversation) {
      conversationId = existingConversation.id;

      // Update the last_message_at timestamp
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Failed to update last_message_at:', updateError);
      }
    } else {
      // Create a new conversation - handle potential race condition
      const { data: newConversation, error: newConvError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: recipient_id,
          ride_id: ride_post_id || null,
        })
        .select()
        .single();

      if (newConvError) {
        // If unique constraint violation, another request created the conversation
        // Try to fetch it again with optimized query
        if (newConvError.code === '23505') {
          let retryQuery = supabase
            .from('conversations')
            .select('*')
            .or(
              `and(participant1_id.eq.${user.id},participant2_id.eq.${recipient_id}),and(participant1_id.eq.${recipient_id},participant2_id.eq.${user.id})`
            );

          if (ride_post_id) {
            retryQuery = retryQuery.eq('ride_id', ride_post_id);
          } else {
            retryQuery = retryQuery.is('ride_id', null);
          }

          const { data: retryConversation } = await retryQuery.maybeSingle();

          if (retryConversation) {
            conversationId = retryConversation.id;
          } else {
            throw newConvError;
          }
        } else {
          throw newConvError;
        }
      } else {
        conversationId = newConversation.id;
      }
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
        content: trimmedContent,
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
            messagePreview: trimmedContent.substring(0, 100),
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

    if (!isValidUUID(conversationId)) {
      return NextResponse.json(
        { error: 'Invalid conversation_id format' },
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
