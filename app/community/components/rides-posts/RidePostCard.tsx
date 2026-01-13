'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { RidePostType, ProfileType } from '@/app/community/types';
import TripBookingModal from '@/components/trips/TripBookingModal';
import { RidePostActions } from './RidePostActions';
import { useProfileCompletionPrompt } from '@/hooks/useProfileCompletionPrompt';
import { useUserProfile } from '@/hooks/useProfile';
import { useIsBlocked } from '@/hooks/useIsBlocked';
import { formatDateLabel, formatTimeLabel } from '@/lib/dateFormat';
import { getBadgeConfig } from '@/app/community/components/utils/postBadges';
import { getDirectionConfig } from '@/app/community/components/utils/tripDirection';
import { sanitizeLocation } from '@/libs/sanitize/location';

interface RidePostCardProps {
  post: RidePostType;
  currentUserId?: string;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, post: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (postId: string) => void;
  deleting?: boolean;
  onViewDetails: () => void;
}

/**
 * Displays ride metadata and action buttons for a single community post.
 *
 * @param props - The data to show and callbacks for messaging or hiding a post.
 */
export function RidePostCard({
  post,
  currentUserId,
  onMessage,
  onDelete,
  deleting,
  onViewDetails,
}: Readonly<RidePostCardProps>) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const isOwner = currentUserId === post.poster_id;
  const { data: profile } = useUserProfile();
  const { isBlocked } = useIsBlocked(post.owner?.id);
  const { showProfileCompletionPrompt, profileCompletionModal } = useProfileCompletionPrompt({
    toastMessage: 'Please finish your profile before contacting other riders.',
    closeRedirect: null,
  });

  const handleRestrictedAction = (action: () => void) => {
    if (!profile?.first_name) {
      showProfileCompletionPrompt();
      return;
    }
    action();
  };

  // Hide posts from blocked users (unless viewing own post)
  if (!isOwner && isBlocked) {
    return null;
  }

  const sanitizedStartLocation = sanitizeLocation(post.start_location);
  const sanitizedEndLocation = sanitizeLocation(post.end_location);
  const cardBackground = 'bg-white dark:bg-slate-900';
  const { styles: badgeStyles, label: badgeLabel } = getBadgeConfig(post.posting_type);
  const {
    label: directionLabel,
    styles: directionStyles,
    isCombinedRoundTrip,
  } = getDirectionConfig(post);
  const departureDateLabel = formatDateLabel(post.departure_date);
  const departureTimeLabel = formatTimeLabel(post.departure_time);
  const returnDateLabel = formatDateLabel(post.return_date);
  const returnTimeLabel = formatTimeLabel(post.return_time);
  const hasReturnInfo = isCombinedRoundTrip && !!returnTimeLabel;

  const seatsAvailable = post.available_seats ?? post.total_seats ?? 0;
  const showBookingButton =
    !isOwner && post.posting_type === 'driver' && post.status === 'active' && seatsAvailable > 0;

  return (
    <>
      <div
        className={`${cardBackground} rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-slate-800 flex flex-col h-full`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
              {post.title || 'Untitled Ride'}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyles}`}
              >
                {badgeLabel}
              </span>
              {directionLabel && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${directionStyles}`}
                >
                  {directionLabel}
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {departureDateLabel ?? 'Date TBD'}
                {departureTimeLabel && ` · ${departureTimeLabel}`}
                {hasReturnInfo && (
                  <span className="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Return: {returnDateLabel} · {returnTimeLabel}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            {post.posting_type === 'driver' && (
              <>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {post.price_per_seat ? `$${post.price_per_seat}/seat` : 'Free'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {post.price_per_seat ? 'cost share · ' : ''}
                  {post.available_seats ?? post.total_seats ?? 0} seats left
                </span>
              </>
            )}
            {isOwner && (
              <span
                className={`mt-1 text-xs px-2 py-1 rounded-full ${
                  post.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                }`}
              >
                {post.status}
              </span>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="mb-4 grow">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 mb-2">
            <span className="font-medium w-12 text-gray-500 dark:text-gray-400">From:</span>
            <span className="truncate flex-1">{sanitizedStartLocation}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium w-12 text-gray-500 dark:text-gray-400">To:</span>
            <span className="truncate flex-1">{sanitizedEndLocation}</span>
          </div>
        </div>

        {/*Details button*/}
        <div>
          <button
            onClick={onViewDetails}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            aria-label={`View full ride details for trip from ${post.start_location} to ${post.end_location}`}
          >
            View Details &rarr;
          </button>
        </div>

        {/* Owner Info (if not owner) */}
        {!isOwner && post.owner && (
          <div className="flex items-center space-x-3 mb-4 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Link href={`/profile/${post.owner.id}`} className="shrink-0">
              {post.owner.profile_photo_url ? (
                <Image
                  src={post.owner.profile_photo_url}
                  alt={`${post.owner.first_name} ${post.owner.last_name}`}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover hover:opacity-90 transition-opacity"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs hover:opacity-90 transition-opacity">
                  👤
                </div>
              )}
            </Link>
            <div className="text-sm">
              <Link href={`/profile/${post.owner.id}`} className="hover:underline">
                <p className="font-medium text-gray-900 dark:text-white">
                  {post.owner.first_name} {post.owner.last_name}
                </p>
              </Link>
            </div>
          </div>
        )}

        <RidePostActions
          post={post}
          isOwner={isOwner}
          onMessage={(recipient, post) => handleRestrictedAction(() => onMessage(recipient, post))}
          onDelete={onDelete}
          deleting={deleting}
          onOpenBooking={() => handleRestrictedAction(() => setIsBookingOpen(true))}
          showBookingButton={!!showBookingButton}
        />
      </div>

      <TripBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        ride={post}
      />

      {profileCompletionModal}
    </>
  );
}
