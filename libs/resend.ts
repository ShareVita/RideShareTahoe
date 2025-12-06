import { Resend } from 'resend';
import type { CreateEmailOptions } from 'resend';
import { createElement } from 'react';
import config from '@/config';

let resendClient: Resend;

const getResendClient = () => {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  resendClient = new Resend(apiKey);
  return resendClient;
};

/**
 * Validates email content to improve deliverability
 */
type ValidateEmailContent = (
  // eslint-disable-next-line no-unused-vars
  subject: string,
  // eslint-disable-next-line no-unused-vars
  text?: string,
  // eslint-disable-next-line no-unused-vars
  html?: string
) => string[];

const validateEmailContent: ValidateEmailContent = (subject, text, html) => {
  const spamTriggers: RegExp[] = [
    /free/gi,
    /urgent/gi,
    /act now/gi,
    /limited time/gi,
    /click here/gi,
    /guarantee/gi,
    /no obligation/gi,
    /winner/gi,
    /congratulations/gi,
    /earn money/gi,
  ];

  const warnings: string[] = [];

  // Check subject line
  if (subject.length > 50) {
    warnings.push('Subject line is too long (>50 chars)');
  }

  if (spamTriggers.some((trigger) => trigger.test(subject))) {
    warnings.push('Subject contains potential spam trigger words');
  }

  // Check for excessive caps
  if (subject.toUpperCase() === subject && subject.length > 5) {
    warnings.push('Subject is all caps');
  }

  // Check content
  if (html && spamTriggers.some((trigger) => trigger.test(html))) {
    warnings.push('Email content contains potential spam trigger words');
  }

  if (warnings.length > 0) {
    console.warn('Email deliverability warnings:', warnings);
  }

  return warnings;
};

// Rate limiting for Resend API (2 requests per second limit)
let lastEmailTime = 0;
const MIN_EMAIL_INTERVAL = 500; // 500ms = 2 requests per second

/**
 * Waits to respect Resend's rate limit of 2 requests per second
 */
const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailTime;

  if (timeSinceLastEmail < MIN_EMAIL_INTERVAL) {
    const waitTime = MIN_EMAIL_INTERVAL - timeSinceLastEmail;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastEmailTime = Date.now();
};

type EmailParams = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

/**
 * Sends an email using the provided parameters with deliverability best practices.
 *
 * @async
 * @param {Object} params - The parameters for sending the email.
 * @param {string | string[]} params.to - The recipient's email address or an array of email addresses.
 * @param {string} params.subject - The subject of the email.
 * @param {string} params.text - The plain text content of the email.
 * @param {string} params.html - The HTML content of the email.
 * @param {string} [params.replyTo] - The email address to set as the "Reply-To" address.
 * @returns {Promise<Object>} A Promise that resolves with the email sending result data.
 */
export const sendEmail = async ({ to, subject, text, html, replyTo }: EmailParams) => {
  // Wait to respect rate limit
  await waitForRateLimit();
  // Validate content for deliverability
  validateEmailContent(subject, text, html);
  // Ensure we have both text and HTML versions for better deliverability
  if (!text && html) {
    // Strip HTML tags for text version if not provided
    let sanitized = html;
    let previous;
    // Remove all <script> blocks in a loop until none remain
    do {
      previous = sanitized;
      sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    } while (sanitized !== previous);
    // Remove all <style> blocks in a loop until none remain
    do {
      previous = sanitized;
      sanitized = sanitized.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    } while (sanitized !== previous);
    // Remove all remaining HTML tags, and normalize whitespace
    text = sanitized
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Ensure at least one of text or html is provided
  if (!text && !html) {
    throw new Error('Either text or html content must be provided to send an email.');
  }

  // Provide a React element as required by Resend's typings
  const reactContent = html
    ? createElement('div', { dangerouslySetInnerHTML: { __html: html } })
    : createElement('div', undefined, text as string);

  const emailData: CreateEmailOptions = {
    from: config.resend.fromAdmin,
    to,
    subject,
    text,
    html,
    replyTo,
    headers: {
      'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      'List-Unsubscribe': `<mailto:${config.resend.supportEmail}?subject=Unsubscribe>`,
    },
    react: reactContent,
  };

  const { data, error } = await getResendClient().emails.send(emailData);

  if (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }

  return data;
};
