import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ProfileType } from '../../types';

interface BaseProfileCardProps {
  profile: ProfileType;
  children?: React.ReactNode;
  showLocation?: boolean;
}

export const BaseProfileCard: React.FC<BaseProfileCardProps> = ({
  profile,
  children,
  showLocation = true,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <Link href={`/profile/${profile.id}`} className="shrink-0">
          {profile.profile_photo_url ? (
            <Image
              src={profile.profile_photo_url}
              alt={profile.first_name || 'User'}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover hover:opacity-90 transition-opacity"
              unoptimized
            />
          ) : (
            <div className="w-16 h-16 bg-linear-to-br from-sky-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl font-bold hover:opacity-90 transition-opacity">
              {profile.first_name?.[0] || profile.last_name?.[0] || '?'}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${profile.id}`} className="hover:underline">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-50 truncate">
              {profile.first_name} {profile.last_name}
            </h3>
          </Link>
          {showLocation && (
            <div className="h-5">
              {profile.city ? (
                <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                  📍 {profile.city}
                  {profile.state ? `, ${profile.state}` : ''}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Location not specified</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {children}

      {/* Footer */}
      <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-4">
        <Link
          href={`/profile/${profile.id}`}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
};
