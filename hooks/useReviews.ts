import {
  MutationFunction,
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

// #region Type Definitions

/** Represents a single review object returned from the API. */
export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: string;
  reviewed_role: string;
  rating: number; // 1 to 5
  comment: string | null;
  created_at: string; // ISO Date String
  booking?: {
    ride: {
      start_location: string;
      end_location: string;
    };
  };
  reviewer?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
  reviewee?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}

/** Represents the aggregated statistics for a user's reviews. */
export interface ReviewStats {
  averageRating: number;
  reviewCount: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** Represents the shape of the data returned by useUserReviews. */
interface UserReviewsResult {
  reviews: Review[];
  stats: ReviewStats;
}

/** Represents the required data structure for submitting a new review. */
export interface ReviewSubmissionData {
  bookingId: string;
  rating: number;
  comment: string;
}

/** Represents the response data after a successful submission. */
interface ReviewSubmissionResponse {
  review: Review;
}

/** Type for the useUserReviews hook return value. */
type UseUserReviewsReturn = UseQueryResult<UserReviewsResult, Error>;

/** Type for the useSubmitReview hook return value. */
type UseSubmitReviewReturn = UseMutationResult<
  ReviewSubmissionResponse,
  Error,
  ReviewSubmissionData
>;

// #endregion

// #region User Reviews Hook

/**
 * Fetches reviews and aggregated statistics for a specific user ID.
 *
 * @param userId The ID of the user whose reviews are being fetched.
 * @param showAll Whether to request the extended review list.
 * @returns A React Query result with reviews and stats for the provided user.
 * @throws {Error} When either reviews or stats endpoints return a failure response.
 */
export const useUserReviews = (
  userId: string | undefined,
  showAll: boolean = false
): UseUserReviewsReturn => {
  const defaultStats: ReviewStats = {
    averageRating: 0,
    reviewCount: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  return useQuery<UserReviewsResult, Error>({
    queryKey: ['reviews', userId, showAll],
    queryFn: async (): Promise<UserReviewsResult> => {
      if (!userId) {
        return { reviews: [], stats: defaultStats };
      }

      const limit = showAll ? 50 : 5;

      // Fetch both reviews and stats in parallel
      const [reviewsResponse, statsResponse] = await Promise.all([
        fetch(`/api/reviews?userId=${userId}&limit=${limit}`),
        fetch(`/api/reviews/stats?userId=${userId}`),
      ]);

      // Ensure we get the JSON data before checking response.ok
      const [reviewsData, statsData]: [
        { reviews: Review[]; error?: string },
        ReviewStats & { error?: string },
      ] = await Promise.all([reviewsResponse.json(), statsResponse.json()]);

      if (!reviewsResponse.ok) {
        throw new Error(reviewsData.error || 'Failed to fetch reviews');
      }

      return {
        reviews: reviewsData.reviews || [],
        stats: statsResponse.ok ? statsData : defaultStats,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// #endregion

// #region Submit Review Hook

/**
 * Submits a new review and invalidates the affected user's reviews query.
 *
 * @returns A mutation result exposing the submission response.
 * @throws {Error} When the POST request does not succeed.
 */
export const useSubmitReview = (): UseSubmitReviewReturn => {
  const queryClient = useQueryClient();

  const mutationFn: MutationFunction<ReviewSubmissionResponse, ReviewSubmissionData> = async (
    reviewData
  ) => {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewData),
    });

    const data: ReviewSubmissionResponse & { error?: string } = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit review');
    }

    return data;
  };

  return useMutation<ReviewSubmissionResponse, Error, ReviewSubmissionData>({
    mutationFn,
    onSuccess: (data) => {
      // Invalidate all queries related to the reviewed user's ID
      // This forces a refetch of their reviews and stats on next render.
      // API returns reviewee_id in the review object
      if (data.review?.reviewee_id) {
        queryClient.invalidateQueries({
          queryKey: ['reviews', data.review.reviewee_id],
        });
      }
    },
  });
};

// #endregion
