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
  // Each stored leg has its own identity and actions; never merge destructive targets.
  const sortedRides = useMemo(() => {
    return [...myRides].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [myRides]);

  const postsSummary = `${sortedRides.length} ${sortedRides.length === 1 ? 'post' : 'posts'}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <p className="text-sm text-gray-600 dark:text-gray-400">{postsSummary}</p>
      </div>

      {sortedRides.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedRides.map((post) => (
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
