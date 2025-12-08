/**
 * Setup Script for Integration Tests
 *
 * This script creates two test users for integration testing.
 * Run with: npx ts-node scripts/setup-test-users.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

interface UserCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

async function createTestUser(supabase: SupabaseClient, user: UserCredentials, userName: string) {
  console.log(`Creating ${userName}...`);
  const { data: userData, error: userError } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
  });

  if (userError) {
    if (userError.message.includes('already registered')) {
      console.log(`✓ ${userName} already exists`);
      return;
    }
    throw userError;
  }

  console.log(`✓ ${userName} created:`, userData.user?.id);

  // Update profile
  if (userData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: user.firstName,
        last_name: user.lastName,
      })
      .eq('id', userData.user.id);

    if (profileError) {
      console.warn(`⚠ Could not update ${userName} profile:`, profileError.message);
    } else {
      console.log(`✓ ${userName} profile updated`);
    }
  }
}

// Main execution
console.log('🚀 Setting up test users for integration tests...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Test user credentials
const userA: UserCredentials = {
  email: 'alice.test@ridetahoe.local',
  password: 'TestPassword123!',
  firstName: 'Alice',
  lastName: 'TestUser',
};

const userB: UserCredentials = {
  email: 'bob.test@ridetahoe.local',
  password: 'TestPassword123!',
  firstName: 'Bob',
  lastName: 'TestUser',
};

try {
  await createTestUser(supabase, userA, 'User A (Alice)');
  console.log('');
  await createTestUser(supabase, userB, 'User B (Bob)');

  console.log('\n✅ Test users setup complete!\n');
  console.log('Add these to your .env.test.local file:\n');
  console.log('TEST_USER_A_EMAIL=alice.test@ridetahoe.local');
  console.log('TEST_USER_A_PASSWORD=TestPassword123!');
  console.log('TEST_USER_B_EMAIL=bob.test@ridetahoe.local');
  console.log('TEST_USER_B_PASSWORD=TestPassword123!');
  console.log('RUN_INTEGRATION_TESTS=true\n');
} catch (error) {
  console.error('❌ Error setting up test users:', error);
  process.exit(1);
}
