'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createClient } from '@/libs/supabase/client';
import MessageModal from '@/components/MessageModal';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useCommunityRides } from '@/app/community/hooks/useCommunityRides';
import { useMessageModal } from '@/app/community/hooks/useMessageModal';
import { useRideActions } from '@/app/community/hooks/useRideActions';
import { RidesTab } from '@/app/community/components/FindRidesTab';
import FindPassengersTab from '@/app/community/components/FindPassengersTab';
import { MyPostsTab } from '@/app/community/components/MyPostsTab';
import { CommunityMembersList } from '@/app/community/components/members';
import MyTripsView from '@/components/trips/MyTripsView';
import { BlockedUsersProvider } from '@/contexts/BlockedUsersContext';

/**
 * The main community page.
 * Displays tabs for finding rides, drivers, and managing user's own posts and trips.
 * Handles initial data fetching and network status monitoring.
 */
export default function CommunityPage() {
  const { user, isLoading: authLoading } = useProtectedRoute();
  const supabase = useMemo(() => createClient(), []);
  const { dataLoading, myRides, setMyRides } = useCommunityRides(supabase, user);
  const { messageModal, openMessageModal, closeMessageModal } = useMessageModal();
  const { deletePost, deletingPost } = useRideActions(supabase, user, setMyRides);

  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(() => {
    const view = searchParams.get('view');
    return view === 'my-posts' ? 'my-posts' : 'driver-rides';
  });

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-sky-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-sky-100 flex items-center justify-center">
        <p className="text-xl text-red-500">Authentication failed. Please log in.</p>
      </div>
    );
  }

  return (
    <BlockedUsersProvider>
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-sky-100 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
                  🚗 Community Rides
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  Find a ride or offer one to your neighbors
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 sm:mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-white/60 dark:bg-slate-900/60 rounded-xl p-2 sm:p-1 shadow-md border border-white/20 dark:border-slate-700/30 gap-2 sm:gap-0 backdrop-blur-md">
              {[
                { id: 'driver-rides', label: 'Find a Driver', icon: '🚗', shortLabel: 'Drivers' },
                {
                  id: 'passenger-rides',
                  label: 'Find Passengers',
                  icon: '👋',
                  shortLabel: 'Passengers',
                },
                {
                  id: 'my-posts',
                  label: 'My Posts',
                  icon: '📝',
                  shortLabel: 'My Posts',
                },
                {
                  id: 'my-trips',
                  label: 'My Trips',
                  icon: '✈️',
                  shortLabel: 'My Trips',
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                    activeTab === tab.id
                      ? 'bg-linear-to-r from-blue-500 to-cyan-400 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6 sm:mb-8">
            <Link
              href="/messages"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium text-sm sm:text-base bg-linear-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <span>💬</span>
              <span>Messages</span>
            </Link>
          </div>

          {/* Rides Section - Shows all ride posts */}
          {activeTab === 'driver-rides' && (
            <RidesTab
              user={user}
              supabase={supabase}
              openMessageModal={openMessageModal}
              hideCommunityMembers
            />
          )}

          {activeTab === 'passenger-rides' && (
            <FindPassengersTab
              user={user}
              supabase={supabase}
              openMessageModal={openMessageModal}
              hideCommunityMembers
            />
          )}

          {activeTab === 'my-posts' && (
            <MyPostsTab
              myRides={myRides}
              user={user}
              openMessageModal={openMessageModal}
              deletePost={deletePost}
              deletingPost={deletingPost}
            />
          )}

          {activeTab === 'my-trips' && (
            <MyTripsView user={user} supabase={supabase} onMessage={openMessageModal} />
          )}

          {/* Community Members Section - shown on ride tabs only, rendered once to avoid duplicate API calls */}
          {(activeTab === 'driver-rides' || activeTab === 'passenger-rides') && (
            <section className="mt-12">
              <CommunityMembersList supabase={supabase} />
            </section>
          )}

          <MessageModal
            isOpen={messageModal.isOpen}
            onClose={closeMessageModal}
            recipient={
              messageModal.recipient
                ? {
                    id: messageModal.recipient.id,
                    first_name: messageModal.recipient.first_name ?? 'User',
                  }
                : null
            }
            ridePost={messageModal.ridePost ?? null}
          />
        </div>
      </div>
    </BlockedUsersProvider>
  );
}
