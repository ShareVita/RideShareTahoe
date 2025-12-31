import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { RidePostType, ProfileType } from '@/app/community/types';
import InviteToRideModal from '@/components/trips/InviteToRideModal';
import { useIsBlocked } from '@/hooks/useIsBlocked';

interface PassengerPostCardProps {
  post: RidePostType;
  currentUserId?: string;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, post: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (postId: string) => void;
  deleting?: boolean;
}

/**
 * Displays ride metadata and action buttons for a single passenger post.
 *
 * @param props - The data to show and callbacks for messaging or hiding a post.
 */
export function PassengerPostCard({
  post,
  currentUserId,
  onMessage,
  onDelete,
  deleting,
}: Readonly<PassengerPostCardProps>) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const isOwner = currentUserId === post.poster_id;
  const { isBlocked } = useIsBlocked(post.owner?.id);

  const badgeStyles = 'bg-green-100 text-green-800';
  const badgeLabel = '👋 Passenger';

  // Hide posts from blocked users (unless viewing own post)
  if (!isOwner && isBlocked) {
    return null;
  }

  // Add direction info if round trip
  let directionLabel = '';
  // If we have a return date merged in, it's a full combined round trip display
  const isCombinedRoundTrip = post.is_round_trip && post.return_date;

  if (post.is_round_trip && !isCombinedRoundTrip && post.trip_direction) {
    directionLabel = post.trip_direction === 'departure' ? '🛫 Outbound' : '🔙 Return';
  } else if (isCombinedRoundTrip) {
    directionLabel = '🔄 Round';
  }

  const cardBackground = 'bg-white dark:bg-slate-900';

  return (
    <div
      className={`${cardBackground} rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-slate-800 flex flex-col h-full`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
            {post.title || 'Untitled Ride Request'}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyles}`}
            >
              {badgeLabel}
            </span>
            {directionLabel && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isCombinedRoundTrip ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'}`}
              >
                {directionLabel}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(post.departure_date).toLocaleDateString()}
              {isCombinedRoundTrip &&
                post.return_date &&
                ` - ${new Date(post.return_date).toLocaleDateString()}`}
            </span>
          </div>
        </div>
        {isOwner && (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              post.status === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
            }`}
          >
            {post.status}
          </span>
        )}
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

      {/* Actions */}
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
        {post.owner && (
          <Link
            href={`/profile/${post.owner.id}`}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors text-center flex-1"
          >
            View Profile
          </Link>
        )}

        {isOwner ? (
          <>
            <Link
              href={`/rides/edit/${post.id}`}
              className="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors text-center flex-1"
            >
              Edit
            </Link>
            {onDelete && (
              <button
                onClick={() => onDelete(post.id)}
                disabled={deleting}
                className={`bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors flex-1 ${
                  deleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {deleting ? '...' : 'Delete'}
              </button>
            )}
          </>
        ) : (
          post.owner && (
            <>
              <button
                onClick={() => post.owner && onMessage(post.owner, post)}
                className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex-1"
              >
                Message
              </button>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors flex-1"
              >
                Invite
              </button>
            </>
          )
        )}
      </div>

      {post.owner && currentUserId && (
        <InviteToRideModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          passengerId={post.owner.id}
          passengerName={post.owner.first_name || 'Passenger'}
          user={{ id: currentUserId }}
        />
      )}
    </div>
  );
}
