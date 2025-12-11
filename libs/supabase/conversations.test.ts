import type { SupabaseClient } from '@supabase/supabase-js';
import * as conversationModule from './conversations';

describe('alphabeticalCompare', () => {
  it('returns negative when first string comes before second', () => {
    expect(conversationModule.alphabeticalCompare('alpha', 'bravo')).toBeLessThan(0);
  });

  it('returns positive when first string comes after second', () => {
    expect(conversationModule.alphabeticalCompare('zebra', 'apple')).toBeGreaterThan(0);
  });

  it('returns zero when strings are equal', () => {
    expect(conversationModule.alphabeticalCompare('charlie', 'charlie')).toBe(0);
  });

  it('handles case-sensitive comparison correctly', () => {
    // localeCompare by default is case-sensitive
    const result = conversationModule.alphabeticalCompare('Apple', 'apple');
    expect(result).not.toBe(0);
  });

  it('handles empty strings', () => {
    expect(conversationModule.alphabeticalCompare('', 'text')).toBeLessThan(0);
    expect(conversationModule.alphabeticalCompare('text', '')).toBeGreaterThan(0);
    expect(conversationModule.alphabeticalCompare('', '')).toBe(0);
  });
});

describe('ensureConversationForRide', () => {
  it('returns an existing conversation when one is found', async () => {
    const existingConversation = {
      id: 'conv-1',
      participant1_id: 'alpha',
      participant2_id: 'bravo',
      ride_id: 'ride-123',
    };

    const maybeSingle = jest.fn().mockResolvedValue({ data: existingConversation, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const or = jest.fn().mockReturnValue({ eq, is: jest.fn(() => ({ maybeSingle })) });
    const select = jest.fn().mockReturnValue({ or });
    const insert = jest.fn();

    const supabase = { from: jest.fn(() => ({ select, insert })) } as unknown as SupabaseClient;

    const result = await conversationModule.ensureConversationForRide(
      supabase,
      'alpha',
      'bravo',
      'ride-123'
    );

    expect(result).toBe(existingConversation);
    expect(insert).not.toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('ride_id', 'ride-123');
  });

  it('creates a new conversation when none exist and orders participants', async () => {
    const newConversation = {
      id: 'conv-2',
      participant1_id: 'alpha',
      participant2_id: 'bravo',
      ride_id: 'ride-456',
    };

    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const or = jest.fn().mockReturnValue({ eq, is: jest.fn(() => ({ maybeSingle })) });
    const select = jest.fn().mockReturnValue({ or });

    const insertSingle = jest.fn().mockResolvedValue({ data: newConversation, error: null });
    const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });

    const supabase = { from: jest.fn(() => ({ select, insert })) } as unknown as SupabaseClient;

    const result = await conversationModule.ensureConversationForRide(
      supabase,
      'bravo',
      'alpha',
      'ride-456'
    );

    expect(result).toBe(newConversation);
    expect(insert).toHaveBeenCalledWith({
      participant1_id: 'alpha',
      participant2_id: 'bravo',
      ride_id: 'ride-456',
    });
    expect(insertSingle).toHaveBeenCalled();
  });
});

describe('sendConversationMessage', () => {
  it('inserts the message and updates the conversation timestamp', async () => {
    const conversationRow = {
      id: 'conv-123',
      participant1_id: 'alpha',
      participant2_id: 'bravo',
      ride_id: null,
    };

    const insert = jest.fn().mockResolvedValue({ error: null });
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });

    let conversationCallCount = 0;
    const supabase = {
      from: jest.fn((tableName: string) => {
        if (tableName === 'conversations') {
          conversationCallCount += 1;
          if (conversationCallCount === 1) {
            const maybeSingle = jest.fn().mockResolvedValue({ data: conversationRow, error: null });
            const eq = jest.fn().mockReturnValue({ maybeSingle });
            const is = jest.fn().mockReturnValue({ maybeSingle });
            const or = jest.fn().mockReturnValue({ eq, is });
            const select = jest.fn().mockReturnValue({ or });
            return { select };
          }

          return { update };
        }
        if (tableName === 'messages') {
          return { insert };
        }
        throw new Error(`Unexpected table ${tableName}`);
      }),
    } as unknown as SupabaseClient;

    await conversationModule.sendConversationMessage({
      supabase,
      senderId: 'alpha',
      recipientId: 'bravo',
      content: 'Hello! 🎉',
      rideId: null,
    });

    expect(insert).toHaveBeenCalledWith({
      sender_id: 'alpha',
      recipient_id: 'bravo',
      ride_id: null,
      conversation_id: 'conv-123',
      subject: null,
      content: 'Hello! 🎉',
    });
    expect(update).toHaveBeenCalledWith({ last_message_at: expect.any(String) });
    expect(updateEq).toHaveBeenCalledWith('id', 'conv-123');
  });
});
