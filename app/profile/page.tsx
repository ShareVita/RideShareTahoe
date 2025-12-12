'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import DeletionRequestStatus from '@/components/DeletionRequestStatus';
import UserReviews from '@/components/UserReviews';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { formatLocation, formatPronouns } from '@/libs/utils';

interface ProfileEntity {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string | null;
  bio?: string | null;

  pronouns?: string | null;
  city?: string | null;
  state?: string | null;

  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  airbnb_url?: string | null;
}

interface ProfileSocials {
  user_id: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  airbnb_url?: string | null;
  other_social_url?: string | null;
}

/**
 * Renders the authenticated user's profile page with support preferences, social links, and account management controls.
 */
export default function ProfilePage() {
  const { user, loading } = useUser();
  const [profile, setProfile] = useState<ProfileEntity | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    setIsNotFound(false);

    try {
      const response = await fetch('/api/profile/me', { credentials: 'include' });

      if (response.status === 401) {
        setProfileError('Unauthorized');
        return;
      }

      if (response.status === 404) {
        setIsNotFound(true);
        setProfile(null);
        return;
      }

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        console.error('Failed to load profile data', errorPayload);
        throw new Error('Failed to load profile');
      }

      type ProfileApiResponse = {
        profile: ProfileEntity | null;
        socials: ProfileSocials | null;
      };

      const payload = (await response.json()) as ProfileApiResponse;

      if (!payload.profile) {
        setIsNotFound(true);
        setProfile(null);
        return;
      }

      setProfile({
        ...payload.profile,
        ...payload.socials,
      });
    } catch (err) {
      console.error('Failed to load profile', err);
      setProfileError('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [loadProfile, user?.id]);

  const profileName = useMemo(() => {
    if (!profile) {
      return '';
    }

    return `${profile.first_name} ${profile.last_name}`;
  }, [profile]);

  const profilePronouns = useMemo(() => {
    if (!profile?.pronouns || profile.pronouns === 'prefer not to answer') {
      return null;
    }

    return formatPronouns(profile.pronouns);
  }, [profile?.pronouns]);

  const formattedLocation = useMemo(() => {
    if (!profile) {
      return null;
    }

    const location = formatLocation({
      city: profile.city,
      state: profile.state,
    });

    const pieces = [location?.city, location?.state].filter(Boolean);
    return pieces.length ? `📍 ${pieces.join(', ')}` : null;
  }, [profile]);

  const socialLinks = useMemo(() => {
    if (!profile) {
      return [];
    }

    const entries = [
      { label: '📘 Facebook', url: profile.facebook_url },
      { label: '📷 Instagram', url: profile.instagram_url },
      { label: '💼 LinkedIn', url: profile.linkedin_url },
      { label: '🏠 Airbnb', url: profile.airbnb_url },
    ];

    return entries.filter((item) => item.url);
  }, [profile]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-md rounded-xl bg-white/80 px-6 py-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Profile</h2>
          <p className="mt-3 text-gray-600">No session</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-md rounded-xl bg-white/80 px-6 py-8 text-center shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Profile</h2>
          <p className="text-gray-600">{profileError}</p>
          <button
            type="button"
            onClick={loadProfile}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-md rounded-xl bg-white/80 px-6 py-8 text-center shadow-lg space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Profile Not Found</h2>
          <p className="text-gray-600">Please complete your profile setup.</p>
          <Link
            href="/profile/edit"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Create Your Profile
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Your Profile
            </p>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mt-1">
              {profileName}
              {profilePronouns && ` (${profilePronouns})`}
            </h1>
          </div>
          <Link
            href="/profile/edit"
            className="rounded-full bg-linear-to-r from-sky-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-sky-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Edit Profile
          </Link>
        </header>

        <section className="rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-xl shadow-blue-100/70 dark:shadow-none border border-white/20 dark:border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
            <div className="flex justify-center lg:justify-start">
              {profile.profile_photo_url ? (
                <Image
                  src={profile.profile_photo_url}
                  alt="Profile"
                  width={160}
                  height={160}
                  unoptimized
                  className="h-40 w-40 rounded-full object-cover ring-4 ring-blue-100 dark:ring-blue-900/50"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-emerald-100 dark:from-sky-900 dark:to-emerald-900 text-4xl ring-4 ring-blue-100 dark:ring-blue-900/50">
                  👤
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Location
                  </p>
                  {formattedLocation ? (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formattedLocation}
                    </p>
                  ) : (
                    <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                      Location not set
                    </p>
                  )}
                </div>
              </div>

              {profile.bio && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Bio
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>

          {socialLinks.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-800">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                Social Links
              </p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.url as string | undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-blue-200 dark:border-blue-800 bg-linear-to-r from-sky-50 to-emerald-50 dark:from-sky-900/30 dark:to-emerald-900/30 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:from-sky-100 hover:to-emerald-100 dark:hover:from-sky-900/50 dark:hover:to-emerald-900/50 transition-all duration-200"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-xl shadow-blue-100/70 dark:shadow-none border border-white/20 dark:border-slate-800">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Reviews & Activity
          </h3>
          <div className="space-y-4">
            <DeletionRequestStatus userId={profile.id} />
            <UserReviews profileId={profile.id} showAll />
          </div>
        </section>

        <div className="flex justify-center pb-4">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 hover:underline transition-colors"
          >
            Request Account Deletion
          </button>
        </div>
      </div>
      <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
    </div>
  );
}
