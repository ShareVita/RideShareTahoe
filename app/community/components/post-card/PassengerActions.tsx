import Link from 'next/link';
import type { RidePostType, ProfileType } from '@/app/community/types';

interface PassengerActionsProps {
  post: RidePostType;
  isOwner: boolean;
  deleting?: boolean;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, post: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (postId: string) => void;
  onInvite: () => void;
}

/**
 * Action buttons for passenger posts, with different options for owners vs non-owners.
 */
export function PassengerActions({
  post,
  isOwner,
  deleting,
  onMessage,
  onDelete,
  onInvite,
}: PassengerActionsProps) {
  return (
    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
      {/* View Profile button (always shown when owner exists) */}
      {post.owner && (
        <Link
          href={`/profile/${post.owner.id}`}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors text-center flex-1"
          aria-label={`View profile of ${post.owner.first_name || 'passenger'} ${post.owner.last_name || ''}`}
        >
          View Profile
        </Link>
      )}

      {isOwner ? (
        // Owner actions: Edit and Delete
        <>
          <Link
            href={`/rides/edit/${post.id}`}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors text-center flex-1"
            aria-label={`Edit ride request: ${post.title || 'Untitled'}`}
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
              type="button"
              aria-label={`Delete ride request: ${post.title || 'Untitled'}`}
              aria-busy={deleting}
            >
              {deleting ? '...' : 'Delete'}
            </button>
          )}
        </>
      ) : (
        // Non-owner actions: Message and Invite
        post.owner && (
          <>
            <button
              onClick={() => onMessage(post.owner!, post)}
              className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex-1"
              type="button"
              aria-label={`Send message to ${post.owner.first_name || 'passenger'}`}
            >
              Message
            </button>
            <button
              onClick={onInvite}
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors flex-1"
              type="button"
              aria-label={`Invite ${post.owner.first_name || 'passenger'} to your ride`}
            >
              Invite
            </button>
          </>
        )
      )}
    </div>
  );
}
