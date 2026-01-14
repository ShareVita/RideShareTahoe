import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';

/**
 * Processes all account deletion requests that have passed their scheduled date.
 * Validates admin status before execution.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Verify admin role via profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        {
          status: 403,
        }
      );
    }

    // Get deletion requests that are ready for processing (scheduled date has passed)
    const { data: readyDeletions, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_deletion_date', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!readyDeletions || readyDeletions.length === 0) {
      return NextResponse.json({
        message: 'No deletion requests ready for processing',
        processedCount: 0,
      });
    }

    const processedUsers: string[] = [];
    const errors: { userId: string; error: string }[] = [];

    // Process each deletion request
    for (const deletionRequest of readyDeletions) {
      await processDeletionRequest(supabase, deletionRequest, processedUsers, errors);
    }

    return NextResponse.json({
      message: `Processed ${processedUsers.length} deletion requests`,
      processedCount: processedUsers.length,
      processedUsers,
      errors: errors.length > 0 ? errors : undefined,
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
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        {
          status: 403,
        }
      );
    }

    // Get all pending deletion requests with user info (email from user_private_info)
    const { data: deletionRequests, error } = await supabase
      .from('account_deletion_requests')
      .select(
        `
        *,
        user:profiles!account_deletion_requests_user_id_fkey (
          id,
          first_name,
          last_name,
          user_private_info (email)
        )
      `
      )
      .in('status', ['pending', 'processing'])
      .order('scheduled_deletion_date', { ascending: true });

    if (error) {
      throw error;
    }

    // Calculate days remaining for each request
    const requestsWithDaysRemaining = deletionRequests.map((request) => {
      const now = new Date();
      const scheduledDate = new Date(request.scheduled_deletion_date);
      const daysRemaining = Math.ceil(
        (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...request,
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

async function processDeletionRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deletionRequest: any,
  processedUsers: string[],
  errors: { userId: string; error: string }[]
) {
  try {
    // Update status to processing
    await supabase
      .from('account_deletion_requests')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
      })
      .eq('id', deletionRequest.id);

    // Get user's email before deletion for tracking (email is in user_private_info)
    const { data: userPrivateInfo } = await supabase
      .from('user_private_info')
      .select('email')
      .eq('id', deletionRequest.user_id)
      .single();

    // Record the email as deleted to prevent recreation
    if (userPrivateInfo?.email) {
      await supabase.from('deleted_emails').upsert(
        {
          email: userPrivateInfo.email.toLowerCase().trim(),
          original_user_id: deletionRequest.user_id,
          deletion_reason: deletionRequest.reason,
        },
        { onConflict: 'email', ignoreDuplicates: true }
      );
    }

    // Delete user profile and related data
    // Note: This will cascade delete due to ON DELETE CASCADE constraints
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', deletionRequest.user_id);

    if (profileError) {
      console.error('Error deleting profile for user ', deletionRequest.user_id, ':', profileError);
      errors.push({
        userId: deletionRequest.user_id,
        error: profileError.message,
      });
      return;
    }

    // Delete the auth user (this requires admin privileges)
    const { error: authError } = await supabase.auth.admin.deleteUser(deletionRequest.user_id);

    if (authError) {
      console.error('Error deleting auth user', deletionRequest.user_id, ':', authError);
      errors.push({
        userId: deletionRequest.user_id,
        error: authError.message,
      });
      return;
    }

    // Mark deletion request as completed
    await supabase
      .from('account_deletion_requests')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', deletionRequest.id);

    processedUsers.push(deletionRequest.user_id);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error processing deletion for user ${deletionRequest.user_id}:`, error);
    errors.push({
      userId: deletionRequest.user_id,
      error: errorMessage,
    });
  }
}
