/**
 * @jest-environment node
 */
/**
 * Integration Test: Two-User Messaging Flow
 *
 * This test verifies the complete messaging flow between two users:
 * 1. User A sends a message to User B
 * 2. User B receives the message
 * 3. User B sends a reply to User A
 * 4. User A receives the reply
 *
 * This test requires a running Supabase instance with the proper schema.
 * Run with: npm test -- route.integration.test.ts
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TEST_EMAIL_DOMAIN = '@example.com';

// Skip this test if not in integration test mode
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = isIntegrationTest ? describe : describe.skip;

describeIntegration('Messages API Integration Test', () => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  let userAId: string;
  let userBId: string;
  let userAEmail: string;
  let userBEmail: string;
  let conversationId: string;
  let messageId1: string;
  let messageId2: string;

  beforeAll(async () => {
    // Initialize Supabase admin client
    // Note: In production, use service role key for admin operations
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate unique test user emails
    const timestamp = Date.now();
    userAEmail = `user-a-${timestamp}${TEST_EMAIL_DOMAIN}`;
    userBEmail = `user-b-${timestamp}${TEST_EMAIL_DOMAIN}`;
  });

  afterAll(async () => {
    // Cleanup: Delete test users and their data
    if (userAId) {
      await supabaseAdmin.from('profiles').delete().eq('id', userAId);
      await supabaseAdmin.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await supabaseAdmin.from('profiles').delete().eq('id', userBId);
      await supabaseAdmin.auth.admin.deleteUser(userBId);
    }
  });

  describe('Setup: Create Test Users', () => {
    it('should create User A with profile', async () => {
      // Create User A
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userAEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      expect(authError).toBeNull();
      expect(authData.user).toBeDefined();
      userAId = authData.user!.id;

      // Verify profile was auto-created
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userAId)
        .single<{
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
        }>();

      expect(profileError).toBeNull();
      expect(profile).toBeDefined();
      expect(profile?.id).toBe(userAId);

      const { data: privateInfo, error: privateError } = await supabaseAdmin
        .from('user_private_info')
        .select('email')
        .eq('id', userAId)
        .single<{ email: string }>();

      expect(privateError).toBeNull();
      expect(privateInfo?.email).toBe(userAEmail);

      // Update profile with test data
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        // @ts-expect-error - Supabase client doesn't have schema types in test environment
        .update({
          first_name: 'Alice',
          last_name: 'TestUser',
        })
        .eq('id', userAId);

      expect(updateError).toBeNull();
    });

    it('should create User B with profile', async () => {
      // Create User B
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userBEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      expect(authError).toBeNull();
      expect(authData.user).toBeDefined();
      userBId = authData.user!.id;

      // Verify profile was auto-created
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userBId)
        .single<{
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
        }>();

      expect(profileError).toBeNull();
      expect(profile).toBeDefined();
      expect(profile?.id).toBe(userBId);

      const { data: privateInfo, error: privateError } = await supabaseAdmin
        .from('user_private_info')
        .select('email')
        .eq('id', userBId)
        .single<{ email: string }>();

      expect(privateError).toBeNull();
      expect(privateInfo?.email).toBe(userBEmail);

      // Update profile with test data
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        // @ts-expect-error - Supabase client doesn't have schema types in test environment
        .update({
          first_name: 'Bob',
          last_name: 'TestUser',
        })
        .eq('id', userBId);

      expect(updateError).toBeNull();
    });
  });

  describe('Setup: Establish active booking', () => {
    let rideId: string | undefined;
    let bookingId: string | undefined;

    beforeAll(async () => {
      if (!userAId || !userBId) {
        throw new Error('Users must exist before setting up a booking');
      }

      // Driver creates a ride (using User A credentials)
      const { data: driverSession, error: driverSessionError } =
        await supabaseAdmin.auth.signInWithPassword({
          email: userAEmail,
          password: 'TestPassword123!',
        });

      expect(driverSessionError).toBeNull();
      expect(driverSession.session).toBeDefined();

      const userAClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${driverSession.session!.access_token}`,
          },
        },
      });

      const futureDeparture = new Date();
      futureDeparture.setDate(futureDeparture.getDate() + 1);
      const [departureDateString, departureTimeWithTZ] = futureDeparture.toISOString().split('T');
      const departureTimeString = departureTimeWithTZ.split('.')[0];

      const { data: ride, error: rideError } = await userAClient
        .from('rides')
        .insert({
          poster_id: userAId,
          posting_type: 'driver',
          start_location: 'San Francisco',
          end_location: 'Tahoe',
          departure_date: departureDateString,
          departure_time: departureTimeString,
          status: 'active',
          total_seats: 3,
          available_seats: 3,
          price_per_seat: 30,
        })
        .select()
        .single();

      expect(rideError).toBeNull();
      const createdRideId = ride!.id;
      rideId = createdRideId;
      await userAClient.auth.signOut();

      // Passenger creates the booking (using User B credentials)
      const { data: passengerSession, error: passengerSessionError } =
        await supabaseAdmin.auth.signInWithPassword({
          email: userBEmail,
          password: 'TestPassword123!',
        });

      expect(passengerSessionError).toBeNull();
      expect(passengerSession.session).toBeDefined();

      const userBClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${passengerSession.session!.access_token}`,
          },
        },
      });

      const { data: booking, error: bookingError } = await userBClient
        .from('trip_bookings')
        .insert({
          ride_id: createdRideId,
          driver_id: userAId,
          passenger_id: userBId,
          pickup_location: 'San Francisco',
          pickup_time: new Date().toISOString(),
          status: 'confirmed',
        })
        .select()
        .single();

      expect(bookingError).toBeNull();
      bookingId = booking?.id;
      await userBClient.auth.signOut();
    });

    it('creates a confirmed booking between User A and B', () => {
      expect(bookingId).toBeDefined();
      expect(rideId).toBeDefined();
    });
  });

  describe('Messaging Flow', () => {
    it('should allow User A to send a message to User B', async () => {
      // Sign in as User A
      const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword(
        {
          email: userAEmail,
          password: 'TestPassword123!',
        }
      );

      expect(signInError).toBeNull();
      expect(sessionData.session).toBeDefined();

      // Create a Supabase client with User A's session
      const userAClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        },
      });

      // Create conversation first (simulating app logic)
      const { data: conversation, error: convCreateError } = await userAClient
        .from('conversations')
        .insert({
          participant1_id: userAId,
          participant2_id: userBId,
          ride_id: null,
        })
        .select()
        .single();

      expect(convCreateError).toBeNull();
      expect(conversation).toBeDefined();
      conversationId = conversation!.id;

      // Send message from User A to User B
      const messageContent = 'Hello Bob! This is Alice. Want to share a ride to Tahoe?';

      const { data: message, error: messageError } = await userAClient
        .from('messages')
        .insert({
          sender_id: userAId,
          recipient_id: userBId,
          content: messageContent,
          conversation_id: conversationId,
          ride_id: null,
        })
        .select()
        .single();

      expect(messageError).toBeNull();
      expect(message).toBeDefined();
      expect(message?.content).toBe(messageContent);
      expect(message?.sender_id).toBe(userAId);
      expect(message?.recipient_id).toBe(userBId);

      messageId1 = message!.id;

      // Sign out User A
      await userAClient.auth.signOut();
    });

    it('should allow User B to see the message from User A', async () => {
      // Sign in as User B
      const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword(
        {
          email: userBEmail,
          password: 'TestPassword123!',
        }
      );

      expect(signInError).toBeNull();
      expect(sessionData.session).toBeDefined();

      // Create a Supabase client with User B's session
      const userBClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        },
      });

      // Fetch conversations for User B
      const { data: conversations, error: convError } = await userBClient
        .from('conversations')
        .select(
          `
          *,
          participant1:profiles!conversations_participant1_id_fkey(id, first_name, last_name),
          participant2:profiles!conversations_participant2_id_fkey(id, first_name, last_name)
        `
        )
        .or(`participant1_id.eq.${userBId},participant2_id.eq.${userBId}`)
        .order('last_message_at', { ascending: false });

      expect(convError).toBeNull();
      expect(conversations).toBeDefined();
      expect(conversations?.length).toBeGreaterThan(0);

      // Fetch messages in the conversation
      const { data: messages, error: msgError } = await userBClient
        .from('messages')
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(id, first_name, last_name)
        `
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      expect(msgError).toBeNull();
      expect(messages).toBeDefined();
      expect(messages?.length).toBe(1);
      expect(messages![0].content).toBe('Hello Bob! This is Alice. Want to share a ride to Tahoe?');
      expect(messages![0].sender_id).toBe(userAId);
      expect(messages![0].recipient_id).toBe(userBId);

      // Sign out User B
      await userBClient.auth.signOut();
    });

    it('should allow User B to reply to User A', async () => {
      // Sign in as User B
      const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword(
        {
          email: userBEmail,
          password: 'TestPassword123!',
        }
      );

      expect(signInError).toBeNull();
      expect(sessionData.session).toBeDefined();

      // Create a Supabase client with User B's session
      const userBClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        },
      });

      // Send reply from User B to User A
      const replyContent = "Hi Alice! Yes, I'd love to! When are you planning to go?";

      const { data: message, error: messageError } = await userBClient
        .from('messages')
        .insert({
          sender_id: userBId,
          recipient_id: userAId,
          content: replyContent,
          conversation_id: conversationId,
          ride_id: null,
        })
        .select()
        .single();

      expect(messageError).toBeNull();
      expect(message).toBeDefined();
      expect(message?.content).toBe(replyContent);
      expect(message?.sender_id).toBe(userBId);
      expect(message?.recipient_id).toBe(userAId);
      expect(message?.conversation_id).toBe(conversationId);

      messageId2 = message!.id;

      // Sign out User B
      await userBClient.auth.signOut();
    });

    it('should allow User A to see the reply from User B', async () => {
      // Sign in as User A
      const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword(
        {
          email: userAEmail,
          password: 'TestPassword123!',
        }
      );

      expect(signInError).toBeNull();
      expect(sessionData.session).toBeDefined();

      // Create a Supabase client with User A's session
      const userAClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        },
      });

      // Fetch messages in the conversation
      const { data: messages, error: msgError } = await userAClient
        .from('messages')
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(id, first_name, last_name)
        `
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      expect(msgError).toBeNull();
      expect(messages).toBeDefined();
      expect(messages?.length).toBe(2);

      // Verify first message (from User A)
      expect(messages![0].id).toBe(messageId1);
      expect(messages![0].sender_id).toBe(userAId);
      expect(messages![0].content).toBe('Hello Bob! This is Alice. Want to share a ride to Tahoe?');

      // Verify second message (from User B)
      expect(messages![1].id).toBe(messageId2);
      expect(messages![1].sender_id).toBe(userBId);
      expect(messages![1].content).toBe("Hi Alice! Yes, I'd love to! When are you planning to go?");

      // Sign out User A
      await userAClient.auth.signOut();
    });
  });

  describe('RLS (Row Level Security) Verification', () => {
    it('should prevent User A from seeing messages not involving them', async () => {
      // Sign in as User A
      const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword(
        {
          email: userAEmail,
          password: 'TestPassword123!',
        }
      );

      expect(signInError).toBeNull();

      const userAClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        },
      });

      // Try to fetch all messages (should only see messages involving User A)
      const { data: messages, error: msgError } = await userAClient.from('messages').select('*');

      expect(msgError).toBeNull();
      expect(messages).toBeDefined();

      // All messages should involve User A as either sender or recipient
      if (messages) {
        for (const msg of messages) {
          expect(msg.sender_id === userAId || msg.recipient_id === userAId).toBe(true);
        }
      }

      await userAClient.auth.signOut();
    });

    it('should prevent unauthenticated users from accessing messages', async () => {
      // Create an unauthenticated client
      const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

      // Try to fetch messages without authentication
      const { data: messages } = await client.from('messages').select('*');

      // Should return empty array due to RLS
      expect(messages).toEqual([]);
    });
  });

  describe('API Endpoint Testing', () => {
    let isServerRunning = false;

    beforeAll(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
        if (res.ok || res.status < 500) {
          isServerRunning = true;
        }
      } catch {
        // Dev server not running
      }
    });

    it('should send a message via POST /api/messages', async () => {
      if (!isServerRunning) return;

      // Sign in as User A
      const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
        email: userAEmail,
        password: 'TestPassword123!',
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
          body: JSON.stringify({
            recipient_id: userBId,
            content: 'Testing API endpoint!',
            ride_post_id: null,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error('API Error Response:', response.status, text);
      }

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(data.message.content).toBe('Testing API endpoint!');
      expect(data.conversation_id).toBe(conversationId);
    });

    it('should fetch messages via GET /api/messages', async () => {
      if (!isServerRunning) return;

      // Sign in as User A
      const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
        email: userAEmail,
        password: 'TestPassword123!',
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/messages?conversation_id=${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session!.access_token}`,
          },
        }
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.messages).toBeDefined();
      expect(Array.isArray(data.messages)).toBe(true);
      expect(data.messages.length).toBeGreaterThan(0);
    });
  });
});
