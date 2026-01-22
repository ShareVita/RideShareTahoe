'use client';

import Link from 'next/link';
import type { RidePostType, ProfileType } from '@/app/community/types';

interface RidePostActionsProps {
  post: RidePostType;
  isOwner: boolean;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, post: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (postId: string) => void;
  deleting?: boolean;
  onOpenBooking: () => void;
  showBookingButton: boolean;
}

export function RidePostActions({
  post,
  isOwner,
  onMessage,
  onDelete,
  deleting,
  onOpenBooking,
  showBookingButton,
}: Readonly<RidePostActionsProps>) {
  return (
    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
      {isOwner ? (
        <>
          <Link
            href={`/rides/edit/${post.id}`}
            className="bg-gray-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors text-center flex-1 flex items-center justify-center"
          >
            Edit
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(post.id)}
              disabled={deleting}
              className={`bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex-1 ${
                deleting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {deleting ? '...' : 'Delete'}
            </button>
          )}
        </>
      ) : (
        <>
          {/* Primary action: Message */}
          {post.owner && (
            <button
              onClick={() => post.owner && onMessage(post.owner, post)}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-1"
            >
              Message
            </button>
          )}
          {/* Conversion action: Request */}
          {showBookingButton && (
            <button
              onClick={onOpenBooking}
              className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex-1"
            >
              Request
            </button>
          )}
          {/* Secondary action: View Profile */}
          {post.owner && (
            <Link
              href={`/profile/${post.owner.id}`}
              className="border-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-transparent px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center flex-1 flex items-center justify-center"
            >
              View Profile
            </Link>
          )}
        </>
      )}
    </div>
  );
}
