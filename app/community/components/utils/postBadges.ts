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
