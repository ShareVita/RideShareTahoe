import { useMemo, useState } from 'react';
import Link from 'next/link';
import { RidePostCard } from '@/app/community/components/rides-posts/RidePostCard';
import type { RidePostType, ProfileType } from '../types';
import PostDetailModal from '@/app/community/components/PostDetailModal';

interface MyRidesTabProps {
  myRides: RidePostType[];
  user: { id: string };
  // eslint-disable-next-line no-unused-vars
  openMessageModal: (recipient: ProfileType, ridePost: RidePostType) => void;
  // eslint-disable-next-line no-unused-vars
  deletePost: (postId: string) => Promise<void>;
  deletingPost: string | null;
}

export function MyPostsTab({
  myRides,
  user,
  openMessageModal,
  deletePost,
  deletingPost,
}: Readonly<MyRidesTabProps>) {
  const [selectedPost, setSelectedPost] = useState<RidePostType | null>(null);
  // Group round trips together
  const groupedRides = useMemo(() => {
    const groups: { [key: string]: RidePostType[] } = {};
    const standalone: RidePostType[] = [];

    for (const ride of myRides) {
      if (ride.round_trip_group_id) {
        if (!groups[ride.round_trip_group_id]) {
          groups[ride.round_trip_group_id] = [];
        }
        groups[ride.round_trip_group_id].push(ride);
      } else {
        standalone.push(ride);
      }
    }

    const mergedGroups = Object.values(groups).map((groupRides) => {
      // If we only have one leg, return as is
      if (groupRides.length === 1) return groupRides[0];

      // Find departure and return legs
      const departureLeg =
        groupRides.find((r) => r.trip_direction === 'departure') || groupRides[0];
      const returnLeg = groupRides.find((r) => r.trip_direction === 'return');

      if (returnLeg) {
        // Merge return info into departure leg for display
        return {
          ...departureLeg,
          return_date: returnLeg.departure_date,
          return_time: returnLeg.departure_time,
        };
      }
      return departureLeg;
    });

    // Combine and sort by created_at (most recent first)
    return [...standalone, ...mergedGroups].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [myRides]);

  const postsSummary = `${groupedRides.length} ${groupedRides.length === 1 ? 'post' : 'posts'}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <p className="text-sm text-gray-600 dark:text-gray-400">{postsSummary}</p>
      </div>

      {groupedRides.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {groupedRides.map((post) => (
            <RidePostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              onMessage={openMessageModal}
              onDelete={deletePost}
              deleting={deletingPost === post.id}
              onViewDetails={() => {
                setSelectedPost(null);
                setTimeout(() => setSelectedPost(post), 0);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white/80 dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
            You haven&apos;t posted any rides yet
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">
            Share your ride or request one to get started!
          </p>
          <Link
            href="/rides/post"
            className="bg-linear-to-r from-blue-500 to-cyan-400 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-500 transition-all duration-200 text-sm sm:text-base shadow-md hover:shadow-lg"
          >
            Create New Post
          </Link>
        </div>
      )}
      {selectedPost && (
        <PostDetailModal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          post={selectedPost}
          currentUserId={user?.id ?? ''}
          onMessage={openMessageModal}
          onDelete={async (postId) => {
            await deletePost(postId);
            setSelectedPost(null);
          }}
          deleting={deletingPost === selectedPost.id}
        />
      )}
    </div>
  );
}
