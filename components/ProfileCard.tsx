import Link from 'next/link';
import Image from 'next/image';

interface Profile {
  readonly id: string;
  readonly first_name: string;
  readonly photo_url: string | null;
  readonly city: string | null;
  readonly role: string;
  readonly bio_excerpt: string | null;
  readonly display_lat?: number;
  readonly display_lng?: number;
  readonly [key: string]: unknown;
}

interface ProfileCardProps {
  readonly profile: Profile;
  // eslint-disable-next-line no-unused-vars
  readonly onMessage: (_profile: Profile) => void;
}

export default function ProfileCard({ profile, onMessage }: ProfileCardProps) {
  const { id, first_name, photo_url, city, role, bio_excerpt } = profile;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'driver':
        return '🚗';
      case 'passenger':
        return '👋';
      case 'both':
        return '🚗/👋';
      default:
        return '👤';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200">
      {/* Profile Header */}
      <div className="flex items-center space-x-3 mb-4">
        <Link href={`/profile/${id}`} className="shrink-0">
          {photo_url ? (
            <Image
              src={photo_url}
              alt={first_name}
              className="w-12 h-12 rounded-full object-cover hover:opacity-90 transition-opacity"
              onError={(e) => {
                console.error('Profile image failed to load:', photo_url);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  (target.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
              unoptimized
            />
          ) : null}
          <div
            data-testid="fallback-icon-container"
            className={`w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity ${photo_url ? 'hidden' : ''}`}
          >
            <span className="text-xl">{getRoleIcon(role)}</span>
          </div>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${id}`} className="hover:underline">
            <h4 className="font-medium text-gray-900">{first_name}</h4>
          </Link>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{getRoleIcon(role)}</span>
            <span className="capitalize">{role.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Location */}
      {city && (
        <div className="mb-3">
          <p className="text-sm text-gray-600">📍 {city}</p>
        </div>
      )}

      {/* Bio */}
      {bio_excerpt && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-3">{bio_excerpt}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <Link
          href={`/profile/${id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm text-center"
        >
          View Profile
        </Link>
        <button
          onClick={() => onMessage(profile)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          Message
        </button>
      </div>
    </div>
  );
}
