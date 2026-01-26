'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { createClient } from '@/libs/supabase/client';
import { fetchAllRides } from '@/libs/community/ridesData';
import { RidePostCard } from '@/app/community/components/rides-posts/RidePostCard';
import type { RidePostType, ProfileType } from '@/app/community/types';
import PostDetailModal from '@/app/community/components/PostDetailModal';

interface Profile {
  first_name: string;
  role: string;
}

export default function WelcomePage() {
  const { user } = useUser();
  const router = useRouter();
  const [ridePosts, setRidePosts] = useState<RidePostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [selectedPost, setSelectedPost] = useState<RidePostType | null>(null);

  // 1. Wrap functions that use external state/router in useCallback to stabilize the dependency array
  const fetchCurrentProfile = useCallback(async () => {
    // Check for user existence inside the function in case of initial null state
    if (!user) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCurrentProfile(data);
    } catch (error) {
      console.error('Error fetching current profile:', error);
    }
  }, [user]);

  const fetchNearbyRidePosts = useCallback(async () => {
    try {
      const supabase = createClient();
      const { rides } = await fetchAllRides(supabase, user, 1, 4);
      setRidePosts(rides);
    } catch (error) {
      console.error('Error fetching ride posts:', error);
      toast.error('Failed to load nearby rides');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleMessage = useCallback(
    (recipient: ProfileType, post: RidePostType) => {
      console.log('📨 handleMessage called', { recipient, post });
      router.push(`/messages`);
    },
    [router]
  );

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchCurrentProfile();
    fetchNearbyRidePosts();
  }, [router, user, fetchCurrentProfile, fetchNearbyRidePosts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Finding rides near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🎉 Welcome to RideShareTahoe!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {ridePosts.length > 0
              ? 'Here are some upcoming rides. Check them out!'
              : 'Looking for rides in your area...'}
          </p>
        </div>

        {/* Ride Posts List */}
        {ridePosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {ridePosts.map((post) => (
              <RidePostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onMessage={handleMessage}
                onViewDetails={() => {
                  setSelectedPost(null);
                  setTimeout(() => setSelectedPost(post), 0);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-8 text-center mb-8 border border-transparent dark:border-slate-800">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No rides available yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              More people are posting rides every day! Check back soon or browse the community.
            </p>
            <button
              onClick={() => router.push('/community')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Community
            </button>
          </div>
        )}

        {/* Role-Specific Next Steps */}
        {currentProfile?.role && (
          <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
            {currentProfile.role === 'passenger' ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  🌟 Ready to Find Your Ride?
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Browse the community to see available drivers and upcoming trips to Lake Tahoe!
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => router.push('/community')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Browse Community →
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  🚗 Next Up: Add Your Vehicle
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Let riders know what you drive! Adding your vehicle helps build trust and makes it
                  easier for passengers to find you.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => router.push('/vehicles')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Add Your Vehicle →
                  </button>
                  <button
                    onClick={() => router.push('/community')}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Browse Community
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {ridePosts.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            💡 Tip: Message drivers directly to learn more about their trips!
          </div>
        )}
      </div>
      {selectedPost && (
        <PostDetailModal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          post={selectedPost}
          currentUserId={user?.id ?? ''}
          onMessage={handleMessage}
        />
      )}
    </div>
  );
}
