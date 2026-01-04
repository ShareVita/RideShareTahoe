import { createClient } from '@/libs/supabase/server';
import { sendEmail as resendSendEmail } from '@/libs/resend';
import { EmailPayload, loadEmailTemplate, ResendSendResult } from './templates';

export type EmailType =
  | 'welcome'
  | 'nurture_day3'
  | 'nurture_week1'
  | 'meeting_reminder'
  | 'meeting_scheduled'
  | 'reengage'
  | 'new_message'
  | 'review_request'
  | 'bulk_announcement'
  | 'welcome_bulk';

export interface SendEmailParams {
  userId: string;
  to: string;
  emailType: EmailType;
  subject?: string;
  html?: string;
  text?: string;
  payload?: EmailPayload;
}

export interface EmailEvent {
  id: number;
  user_id: string;
  email_type: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  external_message_id?: string;
  error?: string;
  to_email: string;
  subject?: string;
  payload: EmailPayload;
  created_at: string;
}

/**
 * Centralized email sending function with idempotency and logging
 */
export async function sendEmail({
  userId,
  to,
  emailType,
  subject,
  html,
  text,
  payload = {},
}: SendEmailParams): Promise<EmailEvent> {
  const supabase = await createClient();

  // 1. Check idempotency
  const existingEvent = await checkIdempotency(supabase, userId, emailType);
  if (existingEvent) return existingEvent;

  // 2. Prepare content
  const { finalSubject, finalHtml, finalText } = await prepareEmailContent(
    emailType,
    subject,
    html,
    text,
    payload
  );

  // 3. Create initial event
  const emailEvent = await createInitialEvent(
    supabase,
    userId,
    emailType,
    to,
    finalSubject,
    payload
  );

  try {
    // 4. Send email via Resend
    const resendResult = await resendSendEmail({
      to,
      subject: finalSubject,
      html: finalHtml,
      text: finalText,
    });

    const resendData = resendResult as ResendSendResult;
    const externalMessageId = resendData.id;

    // 5. Update event with success
    await updateEventStatus(supabase, emailEvent.id, 'sent', externalMessageId);

    return {
      ...emailEvent,
      status: 'sent',
      external_message_id: externalMessageId,
    } as EmailEvent;
  } catch (sendError) {
    const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error';

    // 6. Update event with failure
    await updateEventStatus(supabase, emailEvent.id, 'failed', undefined, errorMessage);

    // Log failure
    console.error('Email failed to send', {
      emailType,
      userId,
      to,
      error: errorMessage,
    });

    throw sendError;
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function checkIdempotency(
  supabase: SupabaseClient,
  userId: string,
  emailType: EmailType
): Promise<EmailEvent | null> {
  // Check for idempotency - prevent duplicate sends for single-shot emails
  if (!['welcome', 'nurture_day3'].includes(emailType)) {
    return null;
  }

  const { data: existingEvent } = await supabase
    .from('email_events')
    .select('id, status')
    .eq('user_id', userId)
    .eq('email_type', emailType)
    .single();

  if (existingEvent) {
    console.log('Email already sent to user, skipping', { emailType, userId });

    // Return the existing event
    const { data: event } = await supabase
      .from('email_events')
      .select('*')
      .eq('id', existingEvent.id)
      .single();

    return event as EmailEvent;
  }

  return null;
}

async function prepareEmailContent(
  emailType: EmailType,
  subject: string | undefined,
  html: string | undefined,
  text: string | undefined,
  payload: EmailPayload
) {
  let finalSubject = subject;
  let finalHtml = html;
  let finalText = text;

  if (!html && !text) {
    const template = await loadEmailTemplate(emailType, payload);
    finalSubject = template.subject;
    finalHtml = template.html;
    finalText = template.text;
  }

  // Ensure we have required content
  if (!finalSubject) {
    throw new Error(`Subject is required for email type: ${emailType}`);
  }
  if (!finalHtml && !finalText) {
    throw new Error(`HTML or text content is required for email type: ${emailType}`);
  }

  // Ensure we have at least one content type
  if (!finalHtml) {
    finalHtml = finalText || '';
  }
  if (!finalText) {
    finalText = finalHtml || '';
  }

  return { finalSubject, finalHtml, finalText };
}

async function createInitialEvent(
  supabase: SupabaseClient,
  userId: string,
  emailType: EmailType,
  to: string,
  subject: string,
  payload: EmailPayload
) {
  const { data: emailEvent, error: eventError } = await supabase
    .from('email_events')
    .insert({
      user_id: userId,
      email_type: emailType,
      status: 'queued',
      to_email: to,
      subject: subject,
      payload: payload,
    })
    .select()
    .single();

  if (eventError) {
    throw new Error(`Failed to create email event: ${eventError.message}`);
  }

  return emailEvent;
}

async function updateEventStatus(
  supabase: SupabaseClient,
  eventId: number,
  status: 'sent' | 'failed',
  externalMessageId?: string,
  errorMessage?: string
) {
  const updateData: { status: string; external_message_id?: string; error?: string } = {
    status,
  };

  if (externalMessageId) {
    updateData.external_message_id = externalMessageId;
  }

  if (errorMessage) {
    updateData.error = errorMessage;
  }

  const { error: updateError } = await supabase
    .from('email_events')
    .update(updateData)
    .eq('id', eventId);

  if (updateError) {
    console.error('Failed to update email event:', updateError);
  }
}

/**
 * Schedule an email to be sent at a specific time
 */
export async function scheduleEmail({
  userId,
  emailType,
  runAfter,
  payload = {},
}: {
  userId: string;
  emailType: EmailType;
  runAfter: Date;
  payload?: EmailPayload;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('scheduled_emails').insert({
    user_id: userId,
    email_type: emailType,
    run_after: runAfter.toISOString(),
    payload,
  });

  if (error) {
    throw new Error(`Failed to schedule email: ${error.message}`);
  }

  console.log('Email scheduled', { emailType, userId, runAfter: runAfter.toISOString() });
}

/**
 * Record user activity for re-engagement logic
 */
export async function recordUserActivity({
  userId,
  event,
  metadata = {},
}: {
  userId: string;
  event: string;
  metadata?: EmailPayload;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('user_activity').insert({
    user_id: userId,
    event,
    metadata,
  });

  if (error) {
    console.error('Failed to record user activity:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Get user's last activity for a specific event
 */
export async function getUserLastActivity(userId: string, event: string): Promise<Date | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_activity')
    .select('at')
    .eq('user_id', userId)
    .eq('event', event)
    .order('at', { ascending: false })
    .limit(1)
    .single();

  return data?.at ? new Date(data.at) : null;
}

/**
 * Check if user should receive re-engagement email
 */
export async function shouldSendReengageEmail(userId: string): Promise<boolean> {
  const supabase = await createClient();

  // Check if user has been inactive for 7+ days
  const lastLogin = await getUserLastActivity(userId, 'login');
  if (!lastLogin) return false;

  const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceLogin < 7) return false;

  // Check if re-engagement email was sent in the last 21 days
  const { data: recentReengage } = await supabase
    .from('email_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('email_type', 'reengage')
    .eq('status', 'sent')
    .gte('created_at', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
    .single();

  return !recentReengage;
}
