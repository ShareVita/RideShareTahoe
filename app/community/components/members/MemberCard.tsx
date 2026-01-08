import React from 'react';
import { ProfileType } from '../../types';
import { BaseProfileCard } from '../common/BaseProfileCard';

interface MemberCardProps {
  readonly profile: ProfileType;
}

export default function MemberCard({ profile }: Readonly<MemberCardProps>) {
  const { bio } = profile;

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
