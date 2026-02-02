import type { RidePostType, ProfileType } from '@/app/community/types';
import { PostActions } from '@/app/community/components/post-card/PostActions';

interface DriverActionsProps {
  post: RidePostType;
  isOwner: boolean;
  showBookingButton: boolean;
  deleting?: boolean;
  // eslint-disable-next-line no-unused-vars
  onMessage: (recipient: ProfileType, post: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (postId: string) => void;
  onOpenBooking: () => void;
}

/**
 * Action buttons for driver posts, including message, book, and delete actions.
 */
export function DriverActions({
  post,
  isOwner,
  showBookingButton,
  deleting,
  onMessage,
  onDelete,
  onOpenBooking,
}: DriverActionsProps) {
  return (
    <PostActions
      post={post}
      isOwner={isOwner}
      onMessage={onMessage}
      onDelete={onDelete}
      deleting={deleting}
      onOpenBooking={onOpenBooking}
      showBookingButton={showBookingButton}
    />
  );
}
