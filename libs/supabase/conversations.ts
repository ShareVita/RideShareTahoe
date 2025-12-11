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
  const matchFilter = `and(participant1_id.eq.${participantA},participant2_id.eq.${participantB}),and(participant1_id.eq.${participantB},participant2_id.eq.${participantA})`;

  let query = supabase.from('conversations').select('*').or(matchFilter);

  query = rideId ? query.eq('ride_id', rideId) : query.is('ride_id', null);

  const { data: existingConversation, error: fetchError } =
    await query.maybeSingle<ConversationRow>();

  if (fetchError) {
    throw fetchError;
  }

  if (existingConversation) {
    return existingConversation;
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
