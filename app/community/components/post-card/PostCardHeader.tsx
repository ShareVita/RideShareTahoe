import type { RidePostType } from '@/app/community/types';
import { formatDateLabel, formatTimeLabel } from '@/lib/dateFormat';
import { getBadgeConfig } from '@/app/community/components/utils/postBadges';
import { getDirectionConfig } from '@/app/community/components/utils/tripDirection';

interface PostCardHeaderProps {
  post: RidePostType;
  isDriverPost: boolean;
  isOwner: boolean;
}

/**
 * Displays the header section of a post card including title, badges, and timing information.
 */
export function PostCardHeader({ post, isDriverPost, isOwner }: PostCardHeaderProps) {
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

  // Calculate seats and price for driver posts
  const hasSeatsData =
    isDriverPost && (post.available_seats !== undefined || post.total_seats !== undefined);
  const seatsAvailable = isDriverPost ? (post.available_seats ?? post.total_seats ?? 0) : 0;

  // Determine seat display message
  const getSeatsMessage = () => {
    if (!isDriverPost || !hasSeatsData) return null;
    if (seatsAvailable === 0) return 'No seats available';
    if (seatsAvailable === 1) return '1 seat left';
    return `${seatsAvailable} seats left`;
  };

  const seatsMessage = getSeatsMessage();

  return (
    <div className="flex justify-between items-start mb-4">
      {/* Left side - Title and badges */}
      <div className="flex-1 min-w-0 pr-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
          {post.title || (isDriverPost ? 'Untitled Ride' : 'Untitled Ride Request')}
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

      {/* Right side - Price/seats for drivers, status badge for owners */}
      <div className="flex flex-col items-end shrink-0">
        {isDriverPost && (
          <>
            <span
              className="text-lg font-bold text-green-600 dark:text-green-400"
              aria-label={
                post.price_per_seat ? `Price: ${post.price_per_seat} dollars per seat` : 'Free ride'
              }
            >
              {post.price_per_seat ? `$${post.price_per_seat}/seat` : 'Free'}
            </span>
            {seatsMessage && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {/* cost share label stays inline but separate node so text matchers see seatsMessage alone */}
                {post.price_per_seat && <span aria-hidden="true">cost share · </span>}
                <span aria-label={seatsMessage}>{seatsMessage}</span>
              </span>
            )}
          </>
        )}
        {isOwner && (
          <span
            className={`mt-1 text-xs px-2 py-1 rounded-full ${
              post.status === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
            }`}
            role="status"
            aria-label={`Post status: ${post.status}`}
          >
            {post.status}
          </span>
        )}
      </div>
    </div>
  );
}
