import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getEmailsByUserId } from '@/libs/email/helpers';
import { processScheduledDeletions } from '@/lib/accountDeletion';

/**
 * Processes all account deletion requests that have passed their scheduled date.
 * Validates admin status before execution.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase: sessionClient } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Verify admin role via profiles table
    const { data: profile, error: profileError } = await sessionClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (profile?.is_admin !== true) {
      return NextResponse.json(
        { error: 'Admin access required' },
        {
          status: 403,
        }
      );
    }

    if (process.env.ACCOUNT_DELETION_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Account deletion is disabled' }, { status: 503 });
    }
    const result = await processScheduledDeletions();
    return NextResponse.json({
      message: `Processed ${result.processedCount} deletion requests`,
      ...result,
    });
  } catch (error) {
    console.error('Error processing deletions:', error);
    return NextResponse.json(
      {
        error: 'Failed to process deletion requests',
      },
      { status: 500 }
    );
  }
}

/**
 * Retrieves all pending deletion requests for admin review.
 * Calculates days remaining for each request.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase: sessionClient } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await sessionClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (profile?.is_admin !== true) {
      return NextResponse.json(
        { error: 'Admin access required' },
        {
          status: 403,
        }
      );
    }

    const supabase = createAdminClient();
    const { data: deletionRequests, error } = await supabase
      .from('account_deletion_requests')
      .select(
        `
        *,
        user:profiles!account_deletion_requests_user_id_fkey (
          id,
          first_name,
          last_name
        )
      `
      )
      .in('status', ['pending', 'processing'])
      .order('scheduled_deletion_date', { ascending: true });

    if (error) {
      throw error;
    }

    // Email lives in user_private_info, which PostgREST cannot embed from
    // profiles; read it separately.
    const emails = await getEmailsByUserId(
      supabase,
      deletionRequests.map((request) => request.user_id)
    );

    // Calculate days remaining for each request
    const requestsWithDaysRemaining = deletionRequests.map((request) => {
      const now = new Date();
      const scheduledDate = new Date(request.scheduled_deletion_date);
      const daysRemaining = Math.ceil(
        (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...request,
        email: emails.get(request.user_id) ?? null,
        daysRemaining: Math.max(0, daysRemaining),
        isReadyForProcessing: daysRemaining <= 0,
      };
    });

    return NextResponse.json({
      deletionRequests: requestsWithDaysRemaining,
      totalCount: requestsWithDaysRemaining.length,
      readyForProcessing: requestsWithDaysRemaining.filter((r) => r.isReadyForProcessing).length,
    });
  } catch (error) {
    console.error('Error fetching deletion requests:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch deletion requests',
      },
      { status: 500 }
    );
  }
}
