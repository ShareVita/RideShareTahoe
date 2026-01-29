import Link from 'next/link';
import Image from 'next/image';
import type { ProfileType } from '@/app/community/types';

interface OwnerInfoProps {
  owner: ProfileType;
}

/**
 * Displays the post owner's profile information with avatar and name.
 * Only shown to non-owners viewing the post.
 */
export function OwnerInfo({ owner }: OwnerInfoProps) {
  return (
    <div className="flex items-center space-x-3 mb-4 pt-4 border-t border-gray-100 dark:border-slate-800">
      <Link href={`/profile/${owner.id}`} className="shrink-0">
        {owner.profile_photo_url ? (
          <Image
            src={owner.profile_photo_url}
            alt={`${owner.first_name} ${owner.last_name}`}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover hover:opacity-90 transition-opacity"
            unoptimized
          />
        ) : (
          <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs hover:opacity-90 transition-opacity">
            👤
          </div>
        )}
      </Link>
      <div className="text-sm">
        <Link href={`/profile/${owner.id}`} className="hover:underline">
          <p className="font-medium text-gray-900 dark:text-white">
            {owner.first_name} {owner.last_name}
          </p>
        </Link>
      </div>
    </div>
  );
}
