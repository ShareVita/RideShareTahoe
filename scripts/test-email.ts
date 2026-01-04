/**
 * Quick script to test Resend email sending
 * Run with: npx tsx scripts/test-email.ts your@email.com
 */

import { config } from 'dotenv';
import { Resend } from 'resend';

// Load .env.local
config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error('Usage: npx tsx scripts/test-email.ts your@email.com');
    process.exit(1);
  }

  console.log(`Sending test email to ${testEmail}...`);

  try {
    const { data, error } = await resend.emails.send({
      from: 'RideShareTahoe <admin@ridesharetahoe.com>',
      to: testEmail,
      subject: 'Test Email from RideShareTahoe',
      html: `
        <h1>It works!</h1>
        <p>Your Resend integration is set up correctly.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
    });

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    console.log('Success! Email sent with ID:', data?.id);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

testEmail();
