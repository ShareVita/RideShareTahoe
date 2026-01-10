'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/libs/supabase/client';
import { formatLocation, formatPronouns } from '@/libs/utils';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import UserReviews from '@/components/UserReviews';
import ReviewModal from '@/components/ReviewModal';
import ReportModal from '@/components/ReportModal';
import MessageModal from '@/components/MessageModal';
import BlockModal from '@/components/BlockModal';
import VehicleDisplay from '@/components/vehicles/VehicleDisplay';
import { useIsBlocked } from '@/hooks/useIsBlocked';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  city?: string;
  state?: string;
  bio?: string;

  pronouns?: string | null;
  support_preferences?: string[];
  support_story?: string;
  [key: string]: unknown;
}

interface ProfileSocials {
  user_id: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  airbnb_url?: string;
  other_social_url?: string;
}

interface PendingReview {
  meeting_id: string;
  booking_id: string;
  other_participant_name: string;
  meeting_title: string;
  [key: string]: unknown;
}

/**
 * Public profile view page - requires authentication to view.
 * Users can see other users' profiles and their own profile.
 */
export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user: currentUser, isLoading: authLoading } = useProtectedRoute();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [socials, setSocials] = useState<ProfileSocials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewButton, setShowReviewButton] = useState(false);

  const [pendingReviewForModal, setPendingReviewForModal] = useState<PendingReview | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const {
    isBlocked: isUserBlocked,
    loading: checkingBlockStatus,
    refetch: refetchBlockStatus,
  } = useIsBlocked(profileId);

  const loadProfile = useCallback(async () => {
    if (!profileId) return;

    try {
      const supabase = createClient();

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;

      if (!profileData) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch socials separately - failure to fetch (RLS block) simply means no socials to show
      const { data: socialsData, error: socialsError } = await supabase
        .from('profile_socials')
        .select('*')
        .eq('user_id', profileId)
        .maybeSingle();

      if (socialsError) {
        console.error('Failed to fetch socials for profile:', socialsError);
        setSocials(null);
      } else if (socialsData) {
        setSocials(socialsData);
      } else {
        setSocials(null); // Explicitly clear if not found/no access
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  const checkPendingReviews = useCallback(async () => {
    if (!profileId) return;
    try {
      const response = await fetch('/api/reviews/pending');
      if (response.ok) {
        const data = await response.json();
        const pendingReview = data.pendingReviews.find(
          (review: PendingReview) => review.other_participant_id === profileId
        );
        if (pendingReview) {
          setShowReviewButton(true);
          setPendingReviewForModal(pendingReview);
        }
      }
    } catch (err) {
      console.error('Error checking pending reviews:', err);
    }
  }, [profileId]);

  useEffect(() => {
    loadProfile();
    checkPendingReviews();
  }, [loadProfile, checkPendingReviews]);

  const profilePronouns = useMemo(() => {
    if (!profile?.pronouns || profile.pronouns === 'prefer not to answer') {
      return null;
    }

    return formatPronouns(profile.pronouns);
  }, [profile?.pronouns]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // useProtectedRoute handles redirect
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="text-gray-600">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => globalThis.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link
              href="/community"
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Profile Not Found</h2>
          <p className="text-gray-600">
            This profile doesn&apos;t exist or is no longer available.
          </p>
          <Link
            href="/community"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/community"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            <span className="mr-2">←</span> Back to Community
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 mb-6 transition-colors">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
            {/* Profile Photo */}
            {profile.profile_photo_url ? (
              <Image
                src={profile.profile_photo_url}
                alt={`${profile.first_name}'s profile`}
                width={128}
                height={128}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900"
                unoptimized
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center text-4xl border-4 border-blue-100 dark:border-blue-900">
                👤
              </div>
            )}

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {profile.first_name} {profile.last_name}
                {profilePronouns && ` (${profilePronouns})`}
              </h1>
              <div className="flex items-center justify-center sm:justify-start space-x-2 mb-3">
                <span className="text-lg text-gray-600 dark:text-gray-300">Community Member</span>
              </div>

              {/* Location */}
              {profile.city && (
                <div className="flex items-center justify-center sm:justify-start text-gray-600 dark:text-gray-400 mb-4">
                  <span className="mr-2">📍</span>
                  <span>
                    {(() => {
                      const formattedLocation = formatLocation({
                        city: profile.city,
                        state: profile.state,
                      });
                      if (!formattedLocation) return null;
                      return (
                        <>
                          {formattedLocation.city}
                          {formattedLocation.state && `, ${formattedLocation.state}`}
                        </>
                      );
                    })()}
                  </span>
                </div>
              )}

              {/* Review Button */}
              {showReviewButton && (
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  ⭐ Leave a Review
                </button>
              )}

              {/* Action Buttons for Other Users */}
              {currentUser.id !== profile.id && (
                <>
                  {/* Only show Message button if not blocked */}
                  {!isUserBlocked && (
                    <button
                      onClick={() => setIsMessageModalOpen(true)}
                      className="ml-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      💬 Message
                    </button>
                  )}
                  <button
                    onClick={() => setIsBlockModalOpen(true)}
                    disabled={checkingBlockStatus}
                    className={`ml-2 px-6 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                      isUserBlocked
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    {isUserBlocked ? '🔓 Unblock' : '🚫 Block'}
                  </button>
                  {/* Only show Report button if not blocked */}
                  {!isUserBlocked && (
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="ml-2 text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                      title="Report User"
                    >
                      ⚠️ Report
                    </button>
                  )}
                </>
              )}

              {currentUser.id === profile.id && (
                <Link
                  href="/profile/edit"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ✏️ Edit Profile
                </Link>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">About</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Vehicles */}
          <VehicleDisplay userId={profile.id} />

          {/* Community Support Preferences */}
          {((profile.support_preferences && profile.support_preferences.length > 0) ||
            profile.support_story) && (
            <div className="mb-6 p-4 bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Community Support Preferences
              </h3>

              {/* Support Preferences */}
              {profile.support_preferences && profile.support_preferences.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Feels most empowered supporting:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.support_preferences.map((pref) => (
                      <span
                        key={pref}
                        className="inline-flex items-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm border border-blue-200 dark:border-blue-700"
                      >
                        {pref === 'elderly_passengers' && '👴 Elderly passengers'}
                        {pref === 'sick_recovering' && '🏥 Medical transport'}
                        {pref === 'low_income_families' && '💰 Cost-conscious travelers'}
                        {pref === 'people_disabilities' && '♿ People with disabilities'}
                        {pref === 'single_parents' && 'Single parents'}
                        {pref === 'other' && '🤝 Other'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Support Story */}
              {profile.support_story && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional thoughts:
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {profile.support_story}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Social Links */}
          {socials &&
            (socials.facebook_url ||
              socials.instagram_url ||
              socials.linkedin_url ||
              socials.airbnb_url) && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Social Links
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {socials.facebook_url && (
                    <a
                      href={socials.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-3 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                    >
                      📘 Facebook
                    </a>
                  )}
                  {socials.instagram_url && (
                    <a
                      href={socials.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-3 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-900/60 transition-colors"
                    >
                      📷 Instagram
                    </a>
                  )}
                  {socials.linkedin_url && (
                    <a
                      href={socials.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-3 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                    >
                      💼 LinkedIn
                    </a>
                  )}
                  {socials.airbnb_url && (
                    <a
                      href={socials.airbnb_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-3 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                    >
                      🏠 Airbnb
                    </a>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Reviews Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">⭐</span> Reviews
          </h2>
          <UserReviews profileId={profile.id} showAll={true} />
        </div>
      </div>

      {/* Review Modal */}
      {pendingReviewForModal && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          pendingReview={pendingReviewForModal}
          onReviewSubmitted={() => {
            setShowReviewButton(false);
            setIsReviewModalOpen(false);
            // Refresh profile data to show updated reviews
            loadProfile();
          }}
        />
      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        recipient={profile ? { id: profile.id, first_name: profile.first_name } : null}
        ridePost={null}
      />

      {/* Block Modal */}
      <BlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        targetUserId={profile.id}
        targetUserName={`${profile.first_name} ${profile.last_name}`}
        isCurrentlyBlocked={isUserBlocked}
        onBlockStateChanged={() => {
          setIsBlockModalOpen(false);
          // If blocking (not unblocking), redirect away since interaction is no longer possible
          if (!isUserBlocked) {
            router.push('/community');
          } else {
            // If unblocking, just refresh the block status and profile
            refetchBlockStatus();
            loadProfile();
          }
        }}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportedUserId={profile.id}
        reportedUserName={`${profile.first_name} ${profile.last_name}`}
      />
    </div>
  );
}
