import type { SupabaseClient } from '@supabase/supabase-js';

interface ConversationRow {
  id: string;
  participant1_id: string;
  participant2_id: string;
  ride_id: string | null;
}

interface SendConversationMessageOptions {
  supabase: SupabaseClient;
  senderId: string;
  recipientId: string;
  rideId?: string | null;
  content: string;
  subject?: string | null;
}

/**
 * Compare function for reliable alphabetical sorting using localeCompare.
 *
 * @param a - First string to compare.
 * @param b - Second string to compare.
 * @returns Negative if a < b, positive if a > b, zero if equal.
 */
export function alphabeticalCompare(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Ensures there is a conversation between two participants for the given ride.
 *
 * @param supabase - Supabase client used for querying the conversations table.
 * @param participantA - First participant UUID.
 * @param participantB - Second participant UUID.
 * @param rideId - Optional ride UUID that ties the conversation to a ride.
 * @returns The existing or newly created conversation record.
 */
export async function ensureConversationForRide(
  supabase: SupabaseClient,
  participantA: string,
  participantB: string,
  rideId: string | null = null
): Promise<ConversationRow> {
  // Use parameterized queries instead of string interpolation to avoid filter injection
  // Query 1: Check if participantA is participant1 and participantB is participant2
  let query1 = supabase
    .from('conversations')
    .select('*')
    .eq('participant1_id', participantA)
    .eq('participant2_id', participantB);

  query1 = rideId ? query1.eq('ride_id', rideId) : query1.is('ride_id', null);

  const { data: match1, error: error1 } = await query1.maybeSingle<ConversationRow>();

  if (error1) {
    throw error1;
  }

  if (match1) {
    return match1;
  }

  // Query 2: Check if participantB is participant1 and participantA is participant2
  let query2 = supabase
    .from('conversations')
    .select('*')
    .eq('participant1_id', participantB)
    .eq('participant2_id', participantA);

  query2 = rideId ? query2.eq('ride_id', rideId) : query2.is('ride_id', null);

  const { data: match2, error: error2 } = await query2.maybeSingle<ConversationRow>();

  if (error2) {
    throw error2;
  }

  if (match2) {
    return match2;
  }

  const [firstParticipant, secondParticipant] = [participantA, participantB].sort(
    alphabeticalCompare
  );

  const { data: newConversation, error: insertError } = await supabase
    .from('conversations')
    .insert({
      participant1_id: firstParticipant,
      participant2_id: secondParticipant,
      ride_id: rideId,
    })
    .select()
    .single<ConversationRow>();

  if (insertError || !newConversation) {
    throw insertError || new Error('Unable to create conversation');
  }

  return newConversation;
}

/**
 * Sends a message between two participants, creating the conversation if needed.
 *
 * @param options - Parameters describing the sender, recipient, and message payload.
 */
export async function sendConversationMessage(
  options: SendConversationMessageOptions
): Promise<void> {
  const { supabase, senderId, recipientId, rideId, content, subject = null } = options;
  const conversation = await ensureConversationForRide(
    supabase,
    senderId,
    recipientId,
    rideId ?? null
  );
  const now = new Date().toISOString();

  const { error: insertError } = await supabase.from('messages').insert({
    sender_id: senderId,
    recipient_id: recipientId,
    ride_id: rideId ?? null,
    conversation_id: conversation.id,
    subject,
    content,
  });

  if (insertError) {
    throw insertError;
  }

  const { error: updateError } = await supabase
    .from('conversations')
    .update({ last_message_at: now })
    .eq('id', conversation.id);

  if (updateError) {
    throw updateError;
  }
}
