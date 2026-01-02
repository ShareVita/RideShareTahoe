/**
 * Send all email templates for review
 * Run with: npx tsx scripts/send-all-templates.ts your@email.com
 */

import { config } from 'dotenv';
import { Resend } from 'resend';
import fs from 'node:fs';
import path from 'node:path';

config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

const templates = [
  { file: 'welcome-email.html', subject: '1/10 - Welcome Email' },
  { file: 'follow-up-3days.html', subject: '2/10 - Follow-up (3 Days)' },
  { file: 'follow-up-1week.html', subject: '3/10 - Follow-up (1 Week)' },
  { file: 'meeting-scheduled-confirmation.html', subject: '4/10 - Meeting Scheduled Confirmation' },
  { file: 'meeting-reminder-1day.html', subject: '5/10 - Meeting Reminder (1 Day)' },
  { file: 'new-message-notification.html', subject: '6/10 - New Message Notification' },
  { file: 're-engagement.html', subject: '7/10 - Re-engagement Email' },
  { file: 'review-request.html', subject: '8/10 - Review Request' },
  { file: 'bulk-announcement.html', subject: '9/10 - Bulk Announcement' },
  { file: 'welcome-bulk.html', subject: '10/10 - Welcome Bulk' },
];

async function sendAllTemplates() {
  const toEmail = process.argv[2];

  if (!toEmail) {
    console.error('Usage: npx tsx scripts/send-all-templates.ts your@email.com');
    process.exit(1);
  }

  const templatesDir = path.join(process.cwd(), 'libs', 'email', 'templates');

  console.log(`Sending ${templates.length} email templates to ${toEmail}...\n`);

  for (const template of templates) {
    try {
      const htmlPath = path.join(templatesDir, template.file);
      let html = fs.readFileSync(htmlPath, 'utf8');

      // Replace template variables with sample data
      html = html
        .replace(/\{\{userName\}\}/g, 'John')
        .replace(/\{\{appUrl\}\}/g, 'https://ridesharetahoe.com')
        .replace(/\{\{supportEmail\}\}/g, 'support@ridesharetahoe.com')
        .replace(/\{\{senderName\}\}/g, 'Jane Smith')
        .replace(
          /\{\{messagePreview\}\}/g,
          'Hey! Are you still available for the ride to Tahoe this weekend?'
        )
        .replace(/\{\{meetingTitle\}\}/g, 'Ride to Lake Tahoe')
        .replace(/\{\{meetingDate\}\}/g, 'Saturday, January 15th')
        .replace(/\{\{meetingTime\}\}/g, '8:00 AM')
        .replace(/\{\{meetingLocation\}\}/g, 'Starbucks on Market St, SF')
        .replace(/\{\{otherParticipantName\}\}/g, 'Jane Smith')
        .replace(/\{\{announcementTitle\}\}/g, 'New Feature: Group Rides!')
        .replace(
          /\{\{announcementContent\}\}/g,
          'We are excited to announce group rides are now available!'
        )
        .replace(/\{\{ctaUrl\}\}/g, 'https://ridesharetahoe.com')
        .replace(/\{\{ctaText\}\}/g, 'Check it out');

      const { data, error } = await resend.emails.send({
        from: 'RideShareTahoe <admin@ridesharetahoe.com>',
        to: toEmail,
        subject: `[REVIEW] ${template.subject}`,
        html,
      });

      if (error) {
        console.error(`❌ ${template.subject}: ${error.message}`);
      } else {
        console.log(`✓ ${template.subject} (ID: ${data?.id})`);
      }

      // Rate limit: wait 600ms between emails
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`❌ ${template.subject}: ${err}`);
    }
  }

  console.log('\nDone! Check your inbox.');
}

sendAllTemplates();
