import React, { useCallback, useState } from 'react';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';
import type { CommunityUser, RidePostType } from '../types';

/**
 * Provides a helper for deleting ride posts created by the current user.
 *
 * @param supabase - Authenticated Supabase client scoped to the community schema.
 * @param user - Currently signed-in community user, if any.
 * @param setMyRides - State setter that keeps the local ride list in sync with Supabase.
 */
export const useRideActions = (
  supabase: CommunitySupabaseClient,
  user: CommunityUser | null,
  setMyRides: React.Dispatch<React.SetStateAction<RidePostType[]>>
) => {
  const [deletingPost, setDeletingPost] = useState<string | null>(null);

  const deletePost = useCallback(
    async (postId: string) => {
      if (
        !user ||
        !confirm(
          'Are you sure you want to delete this post? It will no longer be visible to other users, but existing conversations will be preserved.'
        )
      ) {
        return;
      }

      try {
        setDeletingPost(postId);
        const { error } = await supabase
          .from('rides')
          .update({ status: 'inactive' })
          .eq('id', postId)
          .eq('poster_id', user.id);

        if (error) {
          console.error('Error deleting post:', error);
          alert(
            'Failed to delete post: ' +
              (typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message?: string }).message || 'Unknown error'
                : 'Unknown error')
          );
          return;
        }

        setMyRides((posts) => posts.filter((post) => post.id !== postId));
        alert('Post deleted successfully');
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post: Unknown error');
      } finally {
        setDeletingPost(null);
      }
    },
    [supabase, setMyRides, user]
  );

  return {
    deletePost,
    deletingPost,
  };
};
