'use client';

import React, { useState } from 'react';

import { type Review, useSubmitReview } from '@/hooks/useReviews';

interface PendingReview {
  meeting_id: string;
  booking_id: string;
  other_participant_name: string;
  meeting_title: string;
  [key: string]: unknown;
}

interface ReviewModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly pendingReview: PendingReview | null;
  // eslint-disable-next-line no-unused-vars
  readonly onReviewSubmitted: (review: Review) => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  pendingReview,
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitReviewMutation = useSubmitReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pendingReview) {
      setError('No pending review found');
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().split(/\s+/).filter(Boolean).length < 5) {
      setError('Comment must be at least 5 words');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data = await submitReviewMutation.mutateAsync({
        bookingId: pendingReview.booking_id,
        rating,
        comment: comment.trim(),
      });

      // Reset form
      setRating(0);
      setComment('');

      // Notify parent component
      if (onReviewSubmitted && data?.review) {
        onReviewSubmitted(data.review);
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error('Error submitting review:', err);
      setError((err as Error).message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setError('');
    onClose();
  };

  if (!isOpen || !pendingReview) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto my-4 sm:my-0 shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Leave a Review</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-600 mb-2">
              How was your meeting with{' '}
              <span className="font-medium">{pendingReview.other_participant_name}</span>?
            </p>
            <p className="text-sm text-gray-500">Meeting: {pendingReview.meeting_title}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Star Rating */}
            <fieldset className="mb-4">
              <legend className="block text-sm font-medium text-gray-700 mb-2">Rating *</legend>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                    }`}
                    aria-label={`${star} star${star === 1 ? '' : 's'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </fieldset>

            {/* Comment */}
            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Comment * (minimum 5 words)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black"
                rows={4}
                placeholder="Share your experience with this meeting..."
                style={{ backgroundColor: 'white' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {
                  comment
                    .trim()
                    .split(' ')
                    .filter((word) => word.length > 0).length
                }{' '}
                words
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  rating === 0 ||
                  comment.trim().split(/\s+/).filter(Boolean).length < 5
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
