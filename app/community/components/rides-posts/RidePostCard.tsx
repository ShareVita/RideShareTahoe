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

interface RidePostCardProps {
  post: RidePostType;
  currentUserId?: string;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, post: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (postId: string) => void;
  deleting?: boolean;
}

// Helper functions to reduce component complexity
function getBadgeConfig(type: RidePostType['posting_type']) {
  switch (type) {
    case 'driver':
      return { styles: 'bg-blue-100 text-blue-800', label: '🚗 Driver' };
    case 'passenger':
      return { styles: 'bg-green-100 text-green-800', label: '👋 Passenger' };
    default:
      return { styles: 'bg-purple-100 text-purple-800', label: '🤝 Flexible' };
  }
}

function getDirectionConfig(post: RidePostType) {
  const isCombinedRoundTrip = !!(post.is_round_trip && post.return_date);
  let label = '';
  let styles = 'bg-orange-100 text-orange-800';

  if (post.is_round_trip && !isCombinedRoundTrip && post.trip_direction) {
    label = post.trip_direction === 'departure' ? '🛫 Outbound' : '🔙 Return';
  } else if (isCombinedRoundTrip) {
    label = '🔄 Round';
    styles = 'bg-indigo-100 text-indigo-800';
  }

  return { label, styles, isCombinedRoundTrip };
}

function formatDateLabel(value?: string | null) {
  if (!value) return null;
  const [datePart] = value.split('T');
  if (!datePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeLabel(value?: string | null) {
  if (!value) return null;
  const [hoursPart, minutesPart] = value.split(':');
  const parsedHours = Number(hoursPart);
  if (Number.isNaN(parsedHours)) return null;
  const minutes = minutesPart ? minutesPart.slice(0, 2) : '00';
  const normalizedMinutes = minutes.padEnd(2, '0');
  const hourIn12 = parsedHours % 12 === 0 ? 12 : parsedHours % 12;
  const period = parsedHours >= 12 ? 'PM' : 'AM';
  return `${hourIn12}:${normalizedMinutes} ${period}`;
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
  const vehicleDetails: string | null = post.car_type || null;
  const vehicleLabel = vehicleDetails ? `Vehicle: ${vehicleDetails}` : null;
  const metaTags = [
    vehicleLabel,
    post.driving_arrangement ? `Pickup: ${post.driving_arrangement}` : null,
    post.music_preference ? `Music: ${post.music_preference}` : null,
    post.conversation_preference ? `Conversation: ${post.conversation_preference}` : null,
    post.special_instructions ? `Notes: ${post.special_instructions}` : null,
  ].filter(Boolean);

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
            <span className="truncate flex-1">{post.start_location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium w-12 text-gray-500 dark:text-gray-400">To:</span>
            <span className="truncate flex-1">{post.end_location}</span>
          </div>
        </div>

        {/* Additional metadata */}
        {metaTags.length > 0 && (
          <div className="mb-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            {metaTags.map((meta) => (
              <p key={meta} className="line-clamp-2">
                {meta}
              </p>
            ))}
          </div>
        )}

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
