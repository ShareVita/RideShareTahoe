import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  ensureProfileComplete,
} from '@/lib/supabase/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Retrieves reviews, optionally filtered by userId.
 * Supports pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const offset = Number.parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('reviews')
      .select(
        `
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, profile_photo_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, profile_photo_url),
        booking:trip_bookings(
          id,
          ride:rides(start_location, end_location, departure_date, departure_time)
        )
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // If userId is provided, filter by reviewee_id
    if (userId) {
      query = query.eq('reviewee_id', userId);
    }

    const { data: reviews, error } = await query;

    if (error) throw error;

    return NextResponse.json({ reviews });
  } catch (error: unknown) {
    console.error('Error fetching reviews:', error);

    // Type checking for better error logging
    const err = error as { message?: string; code?: string; details?: string; hint?: string };

    if (err.code) {
      console.error('Database error details:', {
        code: err.code,
        details: err.details,
        hint: err.hint,
        message: err.message,
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch reviews', details: err.message },
      {
        status: 500,
      }
    );
  }
}

/**
 * Creates a new review for a completed ride booking.
 * Validates booking status, input fields, and ensures one review per trip per user.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const profileError = await ensureProfileComplete(supabase, user.id, 'leaving reviews');
    if (profileError) return profileError;

    const { bookingId, rating, comment } = await request.json();

    // Validate input
    const inputError = validateReviewInput(bookingId, rating, comment);
    if (inputError) {
      return NextResponse.json({ error: inputError.error }, { status: inputError.status });
    }

    // Get booking details to validate, including the ride to check date
    const { data: booking, error: bookingError } = await supabase
      .from('trip_bookings')
      .select('*, ride:rides(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      if (bookingError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      throw bookingError;
    }

    // Validate booking eligibility
    const eligibilityError = validateBookingEligibility(booking, user.id);
    if (eligibilityError) {
      return NextResponse.json(
        { error: eligibilityError.error },
        { status: eligibilityError.status }
      );
    }

    // Determine roles
    const ride = booking.ride;
    let roles;
    try {
      roles = determineReviewRoles(ride.posting_type, ride.poster_id, user.id);
    } catch {
      return NextResponse.json({ error: 'Invalid post type for review' }, { status: 400 });
    }

    const { reviewerRole, reviewedRole } = roles;

    // Determine reviewee (the other participant)
    const revieweeId = booking.driver_id === user.id ? booking.passenger_id : booking.driver_id;

    // Check if user has already reviewed this booking
    const { data: existingReviews, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', user.id);

    if (existingError) throw existingError;

    if (existingReviews && existingReviews.length > 0) {
      return NextResponse.json({ error: 'You have already reviewed this trip' }, { status: 400 });
    }

    // Create the review
    const reviewData = {
      booking_id: bookingId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      reviewer_role: reviewerRole,
      reviewed_role: reviewedRole,
      rating,
      comment: comment.trim(),
    };

    console.log('Inserting review data:', reviewData);

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select(
        `
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, profile_photo_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, profile_photo_url),
        booking:trip_bookings(
          id,
          ride:rides(start_location, end_location, departure_date, departure_time)
        )
      `
      )
      .single();

    if (reviewError) {
      console.error('Review insert error:', reviewError);
      throw reviewError;
    }

    return NextResponse.json({ review });
  } catch (error: unknown) {
    console.error('Error creating review:', error);
    const err = error as {
      message: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
    });
    return NextResponse.json(
      {
        error: 'Failed to create review',
        details: err.message,
        code: err.code,
      },
      { status: 500 }
    );
  }
}

/**
 * Validates the review input fields.
 * Enforces rating bounds (1-5) and minimum comment word count (5).
 */
function validateReviewInput(bookingId: string, rating: number, comment: string) {
  if (!bookingId || !rating || !comment) {
    return { error: 'Missing required fields', status: 400 };
  }

  if (rating < 1 || rating > 5) {
    return { error: 'Rating must be between 1 and 5', status: 400 };
  }

  const wordCount = comment
    .trim()
    .split(/\s+/)
    .filter((word: string) => word.length > 0).length;
  if (wordCount < 5) {
    return { error: 'Comment must be at least 5 words', status: 400 };
  }

  return null;
}

interface Ride {
  posting_type: string;
  poster_id: string;
  departure_date: string;
  departure_time: string;
  [key: string]: unknown;
}

interface Booking {
  driver_id: string;
  passenger_id: string;
  status: string;
  ride: Ride;
  [key: string]: unknown;
}

/**
 * Checks if the user is a participant in the booking and if the trip is completed.
 */
function validateBookingEligibility(booking: Booking, userId: string) {
  if (booking.driver_id !== userId && booking.passenger_id !== userId) {
    return {
      error: 'You can only review trips you participated in',
      status: 403,
    };
  }

  if (booking.status !== 'completed') {
    return { error: 'You can only review completed trips', status: 400 };
  }

  // Combine date and time to check if trip has ended
  const ride = booking.ride;
  const tripEndDateTime = new Date(`${ride.departure_date}T${ride.departure_time}`);
  const now = new Date();

  if (now < tripEndDateTime) {
    return {
      error: "You cannot review a trip that hasn't happened yet",
      status: 400,
    };
  }

  return null;
}

/**
 * Infers the reviewer and reviewed roles based on the original posting type.
 */
function determineReviewRoles(postType: string, posterId: string, reviewerId: string) {
  let reviewerRole = '';
  let reviewedRole = '';

  if (postType === 'driver' || postType === 'flexible' || postType === 'dog_available') {
    // Poster is the driver
    reviewerRole = reviewerId === posterId ? 'driver' : 'passenger';
    reviewedRole = reviewerRole === 'driver' ? 'passenger' : 'driver';
  } else if (postType === 'passenger' || postType === 'petpal_available') {
    // Poster is the passenger
    reviewerRole = reviewerId === posterId ? 'passenger' : 'driver';
    reviewedRole = reviewerRole === 'passenger' ? 'driver' : 'passenger';
  } else {
    throw new Error('Invalid post type');
  }

  return { reviewerRole, reviewedRole };
}
