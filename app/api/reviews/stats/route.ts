import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Retrieves aggregate review statistics for a user.
 * Includes average rating, total count, and rating distribution.
 *
 * BOT PROTECTION: Requires authentication to prevent bot scraping of review data.
 * Previously allowed unauthenticated access with userId param - SECURITY ISSUE FIXED.
 */

// Cache for 5 minutes to reduce database load
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    // SECURITY FIX: Always require authentication (removed public userId access)
    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    // Allow viewing own stats or other users' stats (but must be authenticated)
    const userId = userIdParam || user.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        {
          status: 400,
        }
      );
    }

    // Get average rating and review count using database functions
    let avgRating = 0;
    let reviewCount = 0;

    try {
      const { data: avgRatingData, error: avgError } = await supabase.rpc(
        'get_user_average_rating',
        { user_id: userId }
      );

      if (avgError) {
        console.warn('get_user_average_rating function failed:', avgError.message);
      } else {
        avgRating = avgRatingData || 0;
      }
    } catch (error: unknown) {
      const err = error as { message: string };
      console.warn('get_user_average_rating function not available:', err.message);
    }

    try {
      const { data: reviewCountData, error: countError } = await supabase.rpc(
        'get_user_review_count',
        { user_id: userId }
      );

      if (countError) {
        console.warn('get_user_review_count function failed:', countError.message);
      } else {
        reviewCount = reviewCountData || 0;
      }
    } catch (error: unknown) {
      const err = error as { message: string };
      console.warn('get_user_review_count function not available:', err.message);
    }

    // Get rating distribution
    const { data: ratingDistribution, error: distError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

    if (distError) throw distError;

    // Calculate rating distribution
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    ratingDistribution?.forEach((review: { rating: number }) => {
      if (distribution[review.rating] !== undefined) {
        distribution[review.rating]++;
      }
    });

    return NextResponse.json(
      {
        averageRating: avgRating,
        reviewCount: reviewCount,
        ratingDistribution: distribution,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review stats' },
      {
        status: 500,
      }
    );
  }
}
