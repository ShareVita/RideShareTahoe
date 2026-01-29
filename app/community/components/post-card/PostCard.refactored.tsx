'use client';

import { useState } from 'react';
import type { RidePostType, ProfileType } from '@/app/community/types';
import InviteToRideModal from '@/components/trips/InviteToRideModal';
import TripBookingModal from '@/components/trips/TripBookingModal';
import { useProfileCompletionPrompt } from '@/hooks/useProfileCompletionPrompt';
import { useUserProfile } from '@/hooks/useProfile';
import { useIsBlocked } from '@/hooks/useIsBlocked';
import { PostCardHeader } from './PostCardHeader';
import { RouteInfo } from './RouteInfo';
import { OwnerInfo } from './OwnerInfo';
import { DriverActions } from './DriverActions';
import { PassengerActions } from './PassengerActions';

// Type guards for type-safe driver/passenger post checking

/**
 * Type guard to check if a post is a driver post.
 */
function isDriverPost(post: RidePostType): post is RidePostType & { posting_type: 'driver' } {
  return post.posting_type === 'driver';
}

/**
 * Type guard to check if a post is a passenger post.
 */
function isPassengerPost(post: RidePostType): post is RidePostType & { posting_type: 'passenger' } {
  return post.posting_type === 'passenger';
}

interface PostCardProps {
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
 * Unified component for displaying both driver and passenger ride posts.
 * Orchestrates subcomponents to render a complete post card.
 *
 * @param props - The data to show and callbacks for messaging or hiding a post.
 */
export function PostCard({
  post,
  currentUserId,
  onMessage,
  onDelete,
  deleting,
  onViewDetails,
}: Readonly<PostCardProps>) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const isOwner = currentUserId === post.poster_id;
  const isDriver = isDriverPost(post);

  const { data: profile } = useUserProfile();
  const { isBlocked } = useIsBlocked(post.owner?.id);
  const { showProfileCompletionPrompt, profileCompletionModal } = useProfileCompletionPrompt({
    toastMessage: 'Please finish your profile before contacting other riders.',
    closeRedirect: null,
  });

  // Wrapper for actions that require profile completion
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

  // Calculate booking availability for driver posts
  const seatsAvailable = isDriver ? (post.available_seats ?? post.total_seats ?? 0) : 0;

  const showBookingButton = !isOwner && isDriver && post.status === 'active' && seatsAvailable > 0;

  return (
    <>
      <article
        className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-slate-800 flex flex-col h-full"
        aria-label={`${isDriver ? 'Driver' : 'Passenger'} post: ${post.title || 'Untitled'} from ${post.start_location} to ${post.end_location}`}
        role="article"
      >
        {/* Header: Title, badges, timing, and price/status */}
        <PostCardHeader post={post} isDriverPost={isDriver} isOwner={isOwner} />

        {/* Route: Start and end locations */}
        <RouteInfo startLocation={post.start_location} endLocation={post.end_location} />

        {/* View Details button */}
        <div>
          <button
            onClick={onViewDetails}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            aria-label={`View full ride details for trip from ${post.start_location} to ${post.end_location}`}
            type="button"
          >
            View Details &rarr;
          </button>
        </div>

        {/* Owner Info (only shown to non-owners) */}
        {!isOwner && post.owner && <OwnerInfo owner={post.owner} />}

        {/* Actions: Different components for driver vs passenger posts */}
        {isDriver ? (
          <DriverActions
            post={post}
            isOwner={isOwner}
            showBookingButton={showBookingButton}
            deleting={deleting}
            onMessage={(recipient, post) =>
              handleRestrictedAction(() => onMessage(recipient, post))
            }
            onDelete={onDelete}
            onOpenBooking={() => handleRestrictedAction(() => setIsBookingOpen(true))}
          />
        ) : (
          <PassengerActions
            post={post}
            isOwner={isOwner}
            deleting={deleting}
            onMessage={(recipient, post) =>
              handleRestrictedAction(() => onMessage(recipient, post))
            }
            onDelete={onDelete}
            onInvite={() => handleRestrictedAction(() => setIsInviteModalOpen(true))}
          />
        )}
      </article>

      {/* Modals: Only render appropriate modal based on post type */}
      {isDriver && (
        <TripBookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          ride={post}
        />
      )}

      {!isDriver && post.owner && currentUserId && (
        <InviteToRideModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          passengerId={post.owner.id}
          passengerName={post.owner.first_name || 'Passenger'}
          user={{ id: currentUserId }}
        />
      )}

      {profileCompletionModal}
    </>
  );
}

// Export type guards for use in other components
export { isDriverPost, isPassengerPost };
