// Centralized email system exports
export {
  getUserLastActivity,
  recordUserActivity,
  scheduleEmail,
  sendEmail,
  shouldSendReengageEmail,
} from './sendEmail';
export {
  getAppUrl,
  getUserEmail,
  getUserWithEmail,
  getUsersWithEmails,
  sanitizeForLog,
} from './helpers';
export {
  cancelUserScheduledEmails,
  getUserScheduledEmails,
  processScheduledEmails,
  scheduleMeetingReminder,
  scheduleNurtureEmail,
} from './scheduler';
export { getReengageCandidates, processReengageEmails, scheduleReengageEmails } from './reengage';
export { getAvailableEmailTypes, isValidEmailType, loadEmailTemplate } from './templates';
export { emailAnalytics } from '../emailAnalytics';
export { emailQueue } from '../emailQueue';

// Re-export types
export type { EmailEvent, SendEmailParams } from './sendEmail';
export type { ScheduledEmail } from './scheduler';
export type { ReengageResult } from './reengage';
export type { EmailPayload, EmailTemplate, TemplateVariables } from './templates';
export type { EmailQueueOptions, EmailRateLimitConfig } from '../emailQueue';
export type { UserWithEmail } from './helpers';
