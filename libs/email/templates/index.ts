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

  // Try multiple paths for template loading (production compatibility)
  const possiblePaths = [
    path.join(process.cwd(), 'libs', 'email', 'templates'),
    path.join(process.cwd(), 'email-templates'),
    path.join(__dirname),
    path.join(process.cwd(), 'libs', 'email', 'templates', 'email-templates'),
  ];

  let html = '';
  let text = '';
  let templatesDir = '';

  // Try to find templates in different locations
  for (const templatePath of possiblePaths) {
    try {
      const untrustedFilename = templateConfig.html;

      // A robust regex to only allow alphanumeric, hyphens, underscores, and a single dot for extension.
      if (!/^[a-zA-Z0-9_-]+\.html$/.test(untrustedFilename)) {
        throw new Error('Invalid template filename characters.');
      }

      const joinedPath = path.join(templatePath, untrustedFilename);
      const absoluteHtmlPath = path.resolve(joinedPath);
      const baseDir = path.resolve(templatePath);

      if (!absoluteHtmlPath.startsWith(baseDir)) {
        throw new Error('Attempted directory traversal');
      }

      html = fs.readFileSync(absoluteHtmlPath, 'utf8');
      templatesDir = templatePath;
      break;
    } catch {
      // Continue to next path
    }
  }

  if (!html) {
    throw new Error(
      `Template not found: ${templateConfig.html}. Tried paths: ${possiblePaths.join(', ')}`
    );
  }

  // Load text template
  try {
    const textPath = path.join(templatesDir, templateConfig.text);
    text = fs.readFileSync(textPath, 'utf8');
  } catch {
    // If text template doesn't exist, generate from HTML
    text = striptags(html).replaceAll(/\s+/g, ' ').trim();
  }

  // Add default variables
  const defaultVars = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://ridesharetahoe.com',
    supportEmail: config.resend.supportEmail,
    ...variables,
  };

  // Replace variables in templates
  const replaceVariables = (content: string, vars: TemplateVariables) => {
    return Object.entries(vars).reduce((acc, [key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      return acc.replace(regex, String(value || ''));
    }, content);
  };

  html = replaceVariables(html, defaultVars);
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
