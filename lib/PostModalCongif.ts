import type { RidePostType } from '@/app/community/types';

export function getBadgeConfig(type: RidePostType['posting_type']) {
  switch (type) {
    case 'driver':
      return { styles: 'bg-blue-100 text-blue-800', label: '🚗 Driver' };
    case 'passenger':
      return { styles: 'bg-green-100 text-green-800', label: '👋 Passenger' };
    default:
      return { styles: 'bg-purple-100 text-purple-800', label: '🤝 Flexible' };
  }
}

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
