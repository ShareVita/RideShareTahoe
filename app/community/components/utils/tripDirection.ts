import type { RidePostType } from '@/app/community/types';

export function getDirectionConfig(post: RidePostType) {
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
