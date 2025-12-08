import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'node:path';

// Load environment variables from .env.test.local
config({ path: path.resolve(__dirname, '../.env.test.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    'Error: Missing environment variables. Make sure .env.test.local exists and has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  );
  process.exit(1);
}

console.log('Testing Supabase Connection...');
console.log('URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

try {
  const email = `diagnostic-${Date.now()}@test.local`;
  const password = 'TestPassword123!';

  console.log(`Attempting to sign up user: ${email}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('❌ Sign Up Failed:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  if (!data.user) {
    console.error('❌ Sign Up succeeded but no user returned.');
    process.exit(1);
  }

  console.log('✅ Sign Up Successful. User ID:', data.user.id);

  // Give the trigger a moment to run
  console.log('Waiting for profile creation trigger...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error('❌ Profile Fetch Failed:', JSON.stringify(profileError, null, 2));
  } else if (profile) {
    console.log('✅ Profile Found:', profile.email);
  } else {
    console.error('❌ Profile not found (Trigger might have failed).');
  }

  // Cleanup
  console.log('Cleaning up...');
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && SUPABASE_URL) {
      const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey);
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log('✅ User deleted.');
    } else {
      console.log('⚠️ SUPABASE_SERVICE_ROLE_KEY not found, skipping user deletion.');
    }
  } catch (cleanupError) {
    console.error('⚠️ Cleanup failed:', cleanupError);
  }
} catch (err) {
  console.error('❌ Unexpected Error:', err);
}
