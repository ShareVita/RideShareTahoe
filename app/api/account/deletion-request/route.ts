import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Submits a new account deletion request.
 * Checks for existing requests and creates a new one with a 30-day scheduled deletion date.
 */
export const POST = withErrorHandling(async (request?: Request | NextRequest) => {
  const req = request as NextRequest;
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const body = await req.json();
    const { reason } = body;

    // Check if user already has a pending deletion request
    const { data: existingRequest, error: checkError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw checkError;
    }

    if (existingRequest) {
      return NextResponse.json(
        {
          error: 'You already have a pending account deletion request',
        },
        { status: 400 }
      );
    }

    // Create new deletion request
    const { data: deletionRequest, error: insertError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        reason: reason || null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      deletionRequest,
      message:
        'Account deletion request submitted. Your account will be deleted in 30 days unless you cancel the request.',
    });
  } catch (error: unknown) {
    console.error('Error creating deletion request:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit deletion request. Please try again.',
      },
      { status: 500 }
    );
  }
});

/**
 * Retrieves the status of a user's pending deletion request.
 * Returns the request details and days remaining until deletion.
 */
export const GET = withErrorHandling(async (request?: Request | NextRequest) => {
  const req = request as NextRequest;
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(req);

    // Log the authentication attempt for debugging
    console.log('GET Auth check:', {
      user: user?.id,
      error: authError?.message,
    });

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Get user's deletion request status
    const { data: deletionRequest, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    if (!deletionRequest) {
      return NextResponse.json({
        hasPendingRequest: false,
        deletionRequest: null,
      });
    }

    // Calculate days remaining
    const now = new Date();
    const scheduledDate = new Date(deletionRequest.scheduled_deletion_date);
    const daysRemaining = Math.ceil(
      (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      hasPendingRequest: true,
      deletionRequest: {
        ...deletionRequest,
        daysRemaining: Math.max(0, daysRemaining),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching deletion request:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch deletion request status',
      },
      { status: 500 }
    );
  }
});

/**
 * Cancels a pending account deletion request.
 * This effectively "undeletes" the account before the process is finalized.
 */
export const DELETE = withErrorHandling(async (request?: Request | NextRequest) => {
  const req = request as NextRequest;
  const startTime = Date.now();

  try {
    console.log('Starting deletion cancellation request...');

    const { user, authError, supabase } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    console.log(`User authenticated: ${user.id}`);

    // When cancelling, we need to start a new 30-day countdown
    // So we update the scheduled_deletion_date to 30 days from now
    const newScheduledDate = new Date();
    newScheduledDate.setDate(newScheduledDate.getDate() + 30);

    const { data: updatedRequest, error: updateError } = await supabase
      .from('account_deletion_requests')
      .update({
        scheduled_deletion_date: newScheduledDate.toISOString(),
        processed_at: null, // Reset processed_at since we're starting fresh
      })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError) {
      return handleUpdateError(updateError);
    }

    if (!updatedRequest) {
      return NextResponse.json(
        {
          error: 'No pending deletion request found to cancel',
        },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`Deletion cancellation completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message:
        'Account deletion request cancelled successfully. A new 30-day countdown has started.',
      duration: duration,
      newScheduledDate: newScheduledDate.toISOString(),
    });
  } catch (error: unknown) {
    return handleCancellationError(error, startTime);
  }
});

function handleUpdateError(updateError: PostgrestError) {
  console.error('Update error details:', {
    code: updateError.code,
    message: updateError.message,
    details: updateError.details,
    hint: updateError.hint,
  });

  // Handle specific error cases
  if (updateError.code === 'PGRST116') {
    return NextResponse.json(
      {
        error: 'No pending deletion request found to cancel',
      },
      { status: 404 }
    );
  }

  if (updateError.code === '23505') {
    // Unique constraint violation
    return NextResponse.json(
      {
        error: 'Database constraint error. Please contact support.',
      },
      { status: 500 }
    );
  }

  throw updateError;
}

function handleCancellationError(error: unknown, startTime: number) {
  const duration = Date.now() - startTime;
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('Error cancelling deletion request:', {
    error: errorMessage,
    duration: duration,
    stack: errorStack,
  });

  // Return more specific error messages
  if (errorMessage.includes('timeout')) {
    return NextResponse.json(
      {
        error: 'Request timed out. Please try again.',
      },
      { status: 408 }
    );
  }

  if (errorMessage.includes('constraint')) {
    return NextResponse.json(
      {
        error: 'Database constraint error. Please contact support.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: 'Failed to cancel deletion request. Please try again.',
    },
    { status: 500 }
  );
}
