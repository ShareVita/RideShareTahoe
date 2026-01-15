import type { SupabaseClient } from '@supabase/supabase-js';
import * as conversationModule from './conversations';

type MaybeSingleResult<T = unknown> = {
  data: T | null;
  error: null;
};
type MaybeSingleMock<T = unknown> = jest.Mock<Promise<MaybeSingleResult<T>>, []>;
type IsMock<T = unknown> = jest.Mock<{ maybeSingle: MaybeSingleMock<T> }, []>;
type EqMock<T = unknown> = jest.Mock<EqReturn<T>, [string]>;
type EqReturn<T = unknown> =
  | { maybeSingle: MaybeSingleMock<T> }
  | { eq: EqMock<T> }
  | { eq: EqMock<T>; is: IsMock<T> }
  | { is: IsMock<T> };

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

    // Mock for the first query that finds the match
    const maybeSingle: MaybeSingleMock<typeof existingConversation> = jest.fn().mockResolvedValue({
      data: existingConversation,
      error: null,
    });
    const eq: EqMock<typeof existingConversation> = jest.fn((field: string) => {
      if (field === 'ride_id') {
        return { maybeSingle };
      }
      return { eq };
    });
    const select = jest.fn().mockReturnValue({ eq });
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
    expect(eq).toHaveBeenCalledWith('participant1_id', 'alpha');
    expect(eq).toHaveBeenCalledWith('participant2_id', 'bravo');
    expect(eq).toHaveBeenCalledWith('ride_id', 'ride-123');
  });

  it('creates a new conversation when none exist and orders participants', async () => {
    const newConversation = {
      id: 'conv-2',
      participant1_id: 'alpha',
      participant2_id: 'bravo',
      ride_id: 'ride-456',
    };

    // Mock for both queries returning no results
    const maybeSingle: MaybeSingleMock<typeof newConversation> = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const eq: EqMock<typeof newConversation> = jest.fn((field: string) => {
      if (field === 'ride_id') {
        return { maybeSingle };
      }
      return { eq };
    });
    const select = jest.fn().mockReturnValue({ eq });

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
            // First query finds the conversation
            const maybeSingle: MaybeSingleMock<typeof conversationRow> = jest
              .fn()
              .mockResolvedValue({
                data: conversationRow,
                error: null,
              });
            const is: IsMock<typeof conversationRow> = jest.fn().mockReturnValue({ maybeSingle });
            const eq: EqMock<typeof conversationRow> = jest.fn((field: string) => {
              if (field === 'participant1_id' || field === 'participant2_id') {
                // Return object with eq and is methods for chaining
                return { eq, is };
              }
              // For ride_id, return object with is method
              return { is };
            });
            const select = jest.fn().mockReturnValue({ eq });
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
