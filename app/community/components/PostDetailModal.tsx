'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Transition, TransitionChild, DialogTitle } from '@headlessui/react';
import Link from 'next/link';
import Image from 'next/image';
import type { RidePostType, ProfileType } from '@/app/community/types';
import InviteToRideModal from '@/components/trips/InviteToRideModal';
import TripBookingModal from '@/components/trips/TripBookingModal';
import { RidePostActions } from '@/app/community/components/rides-posts/RidePostActions';
import { useHasActiveBooking } from '@/hooks/useHasActiveBooking';
import { useProfileCompletionPrompt } from '@/hooks/useProfileCompletionPrompt';
import { useUserProfile } from '@/hooks/useProfile';
import { formatDateLabel, formatTimeLabel } from '@/lib/dateFormat';

interface PostDetailModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly post: RidePostType;
  currentUserId?: string;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, post: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (postId: string) => void;
  deleting?: boolean;
}

// Helper functions
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

function getMetaTags(post: RidePostType) {
  if (post.posting_type === 'driver') {
    return [
      post.car_type ? `Vehicle: ${post.car_type}` : null,
      post.driving_arrangement ? `Pickup: ${post.driving_arrangement}` : null,
      post.music_preference ? `Music: ${post.music_preference}` : null,
      post.conversation_preference ? `Conversation: ${post.conversation_preference}` : null,
      post.description ? `Description: ${post.description}` : null,
      post.special_instructions ? `Notes: ${post.special_instructions}` : null,
    ].filter(Boolean);
  }

  // Passenger posts
  return [
    post.music_preference ? `Music: ${post.music_preference}` : null,
    post.conversation_preference ? `Conversation: ${post.conversation_preference}` : null,
    post.description ? `Description: ${post.description}` : null,
    post.special_instructions ? `Notes: ${post.special_instructions}` : null,
  ].filter(Boolean);
}

/**
 * Unified modal for displaying ride post details (both driver and passenger posts)
 */
export default function RidePostDetailModal({
  isOpen,
  onClose,
  post,
  currentUserId,
  onMessage,
  onDelete,
  deleting,
}: PostDetailModalProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const isOwner = currentUserId === post.poster_id;
  const isDriver = post.posting_type === 'driver';
  const { hasBooking } = useHasActiveBooking(currentUserId, post.owner?.id);
  const { data: profile } = useUserProfile();
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
  const metaTags = getMetaTags(post);

  const seatsAvailable = post.available_seats ?? post.total_seats ?? 0;
  const showBookingButton = !isOwner && isDriver && post.status === 'active' && seatsAvailable > 0;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-2xl" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-slate-900">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <DialogTitle className="text-base sm:text-2xl font-semibold text-gray-900 dark:text-white">
                      {post.title || 'Untitled Ride'}
                    </DialogTitle>

                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-md font-medium ${badgeStyles}`}
                      >
                        {badgeLabel}
                      </span>

                      {directionLabel && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-md font-medium ${directionStyles}`}
                        >
                          {directionLabel}
                        </span>
                      )}

                      <span className="text-md text-gray-500 dark:text-gray-400">
                        {departureDateLabel ?? 'Date TBD'}
                        {departureTimeLabel && ` · ${departureTimeLabel}`}
                        {hasReturnInfo && (
                          <span className="block mt-0.5 text-md text-gray-500 dark:text-gray-400">
                            Return: {returnDateLabel} · {returnTimeLabel}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Price/Seats (Driver only) */}
                  <div className="flex flex-col items-end shrink-0">
                    {isDriver && (
                      <>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          {post.price_per_seat ? `$${post.price_per_seat}` : 'Free'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {seatsAvailable} seats left
                        </span>
                      </>
                    )}

                    {isOwner && (
                      <span
                        className={`mt-1 text-md px-2 py-1 rounded-full ${
                          post.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                        }`}
                      >
                        {post.status}
                      </span>
                    )}
                  </div>

                  {/* Close button */}
                  <div className="flex justify-center items-center ml-1">
                    <button
                      onClick={onClose}
                      aria-label="Close"
                      className="flex items-center justify-center w-10 h-7 rounded-full text-red-500 hover:text-white hover:bg-red-600 transition text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Route */}
                <div className="mb-4 grow">
                  <div className="flex items-center text-md text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium w-12 text-gray-500 dark:text-gray-400">From:</span>
                    <span className="truncate flex-1">{post.start_location}</span>
                  </div>
                  <div className="flex items-center text-md text-gray-700 dark:text-gray-300">
                    <span className="font-medium w-12 text-gray-500 dark:text-gray-400">To:</span>
                    <span className="truncate flex-1">{post.end_location}</span>
                  </div>
                </div>

                {/* Additional metadata */}
                <div className="max-h-40 overflow-y-auto padding-scroll mb-3">
                  {metaTags.length > 0 && (
                    <div className="mb-4 space-y-1 text-md text-gray-500 dark:text-gray-400">
                      {metaTags.map((meta) => (
                        <p key={meta}>{meta}</p>
                      ))}
                    </div>
                  )}
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
                        <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-md hover:opacity-90 transition-opacity">
                          👤
                        </div>
                      )}
                    </Link>

                    <div className="text-md">
                      <Link href={`/profile/${post.owner.id}`} className="hover:underline">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {post.owner.first_name} {post.owner.last_name}
                        </p>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isOwner ? (
                  /* Owner can edit/delete regardless of post type */
                  <RidePostActions
                    post={post}
                    isOwner={isOwner}
                    onMessage={(recipient, p) =>
                      handleRestrictedAction(() => onMessage(recipient, p))
                    }
                    onDelete={onDelete}
                    deleting={deleting}
                    onOpenBooking={() => handleRestrictedAction(() => setIsBookingOpen(true))}
                    showBookingButton={false}
                    hasActiveBooking={hasBooking}
                  />
                ) : isDriver ? (
                  /* Non-owner viewing driver post */
                  <RidePostActions
                    post={post}
                    isOwner={isOwner}
                    onMessage={(recipient, p) =>
                      handleRestrictedAction(() => onMessage(recipient, p))
                    }
                    onDelete={onDelete}
                    deleting={deleting}
                    onOpenBooking={() => handleRestrictedAction(() => setIsBookingOpen(true))}
                    showBookingButton={!!showBookingButton}
                    hasActiveBooking={hasBooking}
                  />
                ) : (
                  /* Non-owner viewing passenger post */
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
                    {post.owner && (
                      <Link
                        href={`/profile/${post.owner.id}`}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors text-center flex-1"
                      >
                        View Profile
                      </Link>
                    )}

                    {hasBooking && (
                      <button
                        onClick={() =>
                          handleRestrictedAction(() => post.owner && onMessage(post.owner, post))
                        }
                        className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex-1"
                      >
                        Message
                      </button>
                    )}

                    <button
                      onClick={() => handleRestrictedAction(() => setIsInviteModalOpen(true))}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors flex-1"
                    >
                      Invite
                    </button>
                  </div>
                )}

                {/* Modals */}
                {post.owner && currentUserId && (
                  <>
                    <InviteToRideModal
                      isOpen={isInviteModalOpen}
                      onClose={() => setIsInviteModalOpen(false)}
                      passengerId={post.owner.id}
                      passengerName={post.owner.first_name || 'Passenger'}
                      user={{ id: currentUserId }}
                    />

                    <TripBookingModal
                      isOpen={isBookingOpen}
                      onClose={() => setIsBookingOpen(false)}
                      ride={post}
                    />
                  </>
                )}

                {profileCompletionModal}
              </div>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
