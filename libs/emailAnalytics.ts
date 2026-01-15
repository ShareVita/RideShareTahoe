import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Email event data structure
 */
interface EmailEvent {
  email_type?: string;
  user_id?: string;
  trigger?: string;
  email_id: string;
  recipient_email?: string;
  event_type: string;
  timestamp: string;
  link_url?: string;
  bounce_type?: string;
  bounce_reason?: string;
}

/**
 * Email metrics summary
 */
interface EmailMetrics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
}

/**
 * Track email delivery and engagement metrics
 */
export class EmailAnalytics {
  private supabase: SupabaseClient | null = null;

  private async getSupabase(): Promise<SupabaseClient> {
    this.supabase ??= await createClient();
    return this.supabase;
  }

  /**
   * Track email sent event
   * @param params - Email tracking parameters
   * @param params.emailType - Type of email (welcome, new_message, etc.)
   * @param params.userId - User ID receiving the email
   * @param params.trigger - What triggered the email
   * @param params.emailId - Resend email ID
   * @param params.recipientEmail - Recipient email address
   */
  async trackEmailSent({
    emailType,
    userId,
    trigger,
    emailId,
    recipientEmail,
  }: {
    emailType: string;
    userId: string;
    trigger: string;
    emailId: string;
    recipientEmail: string;
  }) {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_type: emailType,
        user_id: userId,
        trigger: trigger,
        email_id: emailId,
        recipient_email: recipientEmail,
        event_type: 'sent',
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email sent:', error);
      }
    } catch (error) {
      console.error('Error tracking email sent:', error);
    }
  }

  /**
   * Track email opened event
   * @param {string} emailId - Resend email ID
   */
  async trackEmailOpened(emailId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_id: emailId,
        event_type: 'opened',
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email opened:', error);
      }
    } catch (error) {
      console.error('Error tracking email opened:', error);
    }
  }

  /**
   * Track email clicked event
   * @param {string} emailId - Resend email ID
   * @param {string} linkUrl - URL that was clicked
   */
  async trackEmailClicked(emailId: string, linkUrl: string): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_id: emailId,
        event_type: 'clicked',
        link_url: linkUrl,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email clicked:', error);
      }
    } catch (error) {
      console.error('Error tracking email clicked:', error);
    }
  }

  /**
   * Track email bounced event
   * @param {string} emailId - Resend email ID
   * @param {string} bounceType - Type of bounce (hard, soft)
   * @param {string} reason - Bounce reason
   */
  async trackEmailBounced(emailId: string, bounceType: string, reason: string): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_id: emailId,
        event_type: 'bounced',
        bounce_type: bounceType,
        bounce_reason: reason,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email bounced:', error);
      }
    } catch (error) {
      console.error('Error tracking email bounced:', error);
    }
  }

  /**
   * Track email complained event (spam complaint)
   * @param {string} emailId - Resend email ID
   */
  async trackEmailComplained(emailId: string) {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from('email_events').insert({
        email_id: emailId,
        event_type: 'complained',
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking email complained:', error);
      }
    } catch (error) {
      console.error('Error tracking email complained:', error);
    }
  }

  /**
   * Get email metrics for a specific time period
   * @param {Date} startDate - Start date for metrics
   * @param {Date} endDate - End date for metrics
   * @param {string} emailType - Optional email type filter
   */
  async getEmailMetrics(
    startDate: Date,
    endDate: Date,
    emailType: string | null = null
  ): Promise<EmailMetrics | null> {
    try {
      const supabase = await this.getSupabase();
      let query = supabase
        .from('email_events')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (emailType) {
        query = query.eq('email_type', emailType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting email metrics:', error);
        return null;
      }

      const metrics: EmailMetrics = {
        totalSent: data.filter((e: EmailEvent) => e.event_type === 'sent').length,
        totalOpened: data.filter((e: EmailEvent) => e.event_type === 'opened').length,
        totalClicked: data.filter((e: EmailEvent) => e.event_type === 'clicked').length,
        totalBounced: data.filter((e: EmailEvent) => e.event_type === 'bounced').length,
        totalComplained: data.filter((e: EmailEvent) => e.event_type === 'complained').length,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        complaintRate: 0,
      };

      if (metrics.totalSent > 0) {
        metrics.openRate = (metrics.totalOpened / metrics.totalSent) * 100;
        metrics.clickRate = (metrics.totalClicked / metrics.totalSent) * 100;
        metrics.bounceRate = (metrics.totalBounced / metrics.totalSent) * 100;
        metrics.complaintRate = (metrics.totalComplained / metrics.totalSent) * 100;
      }

      return metrics;
    } catch (error) {
      console.error('Error getting email metrics:', error);
      return null;
    }
  }

  /**
  /**
   * Get user email engagement history
   * @param userId - User ID
   */
  async getUserEmailHistory(userId: string): Promise<EmailEvent[] | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error getting user email history:', error);
        return null;
      }

      return data;
    } catch (error: unknown) {
      console.error('Error getting user email history:', error);
      return null;
    }
  }
}

// Export singleton instance
export const emailAnalytics = new EmailAnalytics();
