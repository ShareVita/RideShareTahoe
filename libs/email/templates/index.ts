import fs from 'node:fs';
import path from 'node:path';
import config from '@/config';
import striptags from 'striptags';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ResendSendResult {
  id: string;
}

export interface EmailPayload {
  [key: string]: string | number | boolean | null | undefined;
}

// Template registry mapping email types to template files
const TEMPLATE_REGISTRY = {
  welcome: {
    html: 'welcome-email.html',
    text: 'welcome-email.txt',
    subject: (vars: TemplateVariables) => {
      const nameSuffix = vars.userName ? `, ${vars.userName}` : '';
      return `Welcome to RideShareTahoe${nameSuffix}!`;
    },
  },
  nurture_day3: {
    html: 'follow-up-3days.html',
    text: 'follow-up-3days.txt',
    subject: () => `Ready to hit the road? 🏔️`,
  },
  meeting_reminder: {
    html: 'meeting-reminder-1day.html',
    text: 'meeting-reminder-1day.txt',
    subject: (vars: TemplateVariables) =>
      `Reminder: ${vars.meetingTitle || 'Your trip'} is tomorrow 🚗`,
  },
  reengage: {
    html: 're-engagement.html',
    text: 're-engagement.txt',
    subject: () => `We miss you at RideShareTahoe! 🏔️`,
  },
  new_message: {
    html: 'new-message-notification.html',
    text: 'new-message-notification.txt',
    subject: (vars: TemplateVariables) =>
      `New message from ${vars.senderName || 'someone'} on RideShareTahoe 💬`,
  },
  meeting_scheduled: {
    html: 'meeting-scheduled-confirmation.html',
    text: 'meeting-scheduled-confirmation.txt',
    subject: (vars: TemplateVariables) =>
      `Trip confirmed: ${vars.meetingTitle || 'Ride'} on RideShareTahoe 🚗`,
  },
  nurture_week1: {
    html: 'follow-up-1week.html',
    text: 'follow-up-1week.txt',
    subject: () => `Still looking for a ride to Tahoe?`,
  },
  review_request: {
    html: 'review-request.html',
    text: 'review-request.txt',
    subject: (vars: TemplateVariables) =>
      `How was your ride with ${vars.otherUserName || 'your driver'}?`,
  },
  bulk_announcement: {
    html: 'bulk-announcement.html',
    text: 'bulk-announcement.txt',
    subject: () => `News from RideShareTahoe`,
  },
  welcome_bulk: {
    html: 'welcome-bulk.html',
    text: 'welcome-bulk.txt',
    subject: (vars: TemplateVariables) => {
      const nameSuffix = vars.userName ? `, ${vars.userName}` : '';
      return `Welcome to RideShareTahoe${nameSuffix}!`;
    },
  },
  community_growth_day30: {
    html: 'community-growth-30days.html',
    text: 'community-growth-30days.txt',
    subject: () => `One month with RideShareTahoe — help us grow!`,
  },
};

/**
 * Load and process email template with variables
 */
export async function loadEmailTemplate(
  emailType: keyof typeof TEMPLATE_REGISTRY,
  variables: TemplateVariables = {}
): Promise<EmailTemplate> {
  const templateConfig = TEMPLATE_REGISTRY[emailType];
  if (!templateConfig) {
    throw new Error(`Unknown email type: ${emailType}`);
  }

  // Next's production file tracing includes this canonical directory.
  const directory = path.join(process.cwd(), 'libs', 'email', 'templates');
  let html = fs.readFileSync(path.join(directory, templateConfig.html), 'utf8');
  let text: string;
  try {
    text = fs.readFileSync(path.join(directory, templateConfig.text), 'utf8');
  } catch (error) {
    if ((error as { code?: string }).code !== 'ENOENT') throw error;
    text = striptags(html).replaceAll(/\s+/g, ' ').trim();
  }

  // Add default variables
  const defaultVars: TemplateVariables = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharetahoe.com',
    supportEmail: config.resend.supportEmail,
    unsubscribeUrl: `mailto:${config.resend.supportEmail}?subject=Unsubscribe`,
    ...variables,
  };
  for (const [key, value] of Object.entries(defaultVars)) {
    if (key.endsWith('Url') && value) {
      const url = new URL(String(value));
      if (
        !['https:', 'http:'].includes(url.protocol) &&
        !(key === 'unsubscribeUrl' && url.protocol === 'mailto:')
      ) {
        throw new Error(`Unsafe email URL: ${key}`);
      }
    }
  }

  // Replace variables in templates
  const replaceVariables = (content: string, vars: TemplateVariables, escapeHtml = false) => {
    return content.replace(/{{(\w+)}}/g, (_match, key: string) => {
      const value = String(vars[key] ?? '');
      if (!escapeHtml) return value;
      return value.replace(
        /[&<>"']/g,
        (character) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[character]!
      );
    });
  };

  html = replaceVariables(html, defaultVars, true);
  text = replaceVariables(text, defaultVars);

  // Generate subject
  const subject = templateConfig.subject(defaultVars);

  return {
    subject,
    html,
    text,
  };
}

/**
 * Get all available email types
 */
export function getAvailableEmailTypes(): string[] {
  return Object.keys(TEMPLATE_REGISTRY);
}

/**
 * Check if email type is valid
 */
export function isValidEmailType(emailType: string): emailType is keyof typeof TEMPLATE_REGISTRY {
  return emailType in TEMPLATE_REGISTRY;
}
