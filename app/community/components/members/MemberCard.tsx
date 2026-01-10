'use client';

import React from 'react';
import { ProfileType } from '../../types';
import { BaseProfileCard } from '../common/BaseProfileCard';
import { useIsBlocked } from '@/hooks/useIsBlocked';

interface MemberCardProps {
  readonly profile: ProfileType;
}

export default function MemberCard({ profile }: Readonly<MemberCardProps>) {
  const { bio } = profile;
  const { isBlocked } = useIsBlocked(profile.id);

  // Hide cards for blocked users (defense in depth - RLS should also filter these)
  if (isBlocked) {
    return null;
  }

  return (
    <BaseProfileCard profile={profile}>
      {/* Bio */}
      {bio && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-3">{bio}</p>
        </div>
      )}
    </BaseProfileCard>
  );
}
