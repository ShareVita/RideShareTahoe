import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { CommunityUser, RidePostType } from '../types';

/** Delete scope options */
export type DeleteScope = 'single' | 'future' | 'all';

/** Edit scope options */
export type EditScope = 'single' | 'future' | 'all';

/** Pending deletion state for confirmation flow */
export interface PendingDeletion {
  postId: string;
  rideToDelete: RidePostType;
  seriesRides: RidePostType[];
  isMultiDateSeries: boolean;
  isRoundTrip: boolean;
  hasGroup: boolean;
}

/** Pending edit state for scope selection flow */
export interface PendingEdit {
  postId: string;
  rideToEdit: RidePostType;
  seriesRides: RidePostType[];
  isMultiDateSeries: boolean;
}

/**
 * Provides helpers for managing ride posts (delete, edit, etc).
 * Handles round trips and multi-date series with scope selection.
 *
 * Returns `pendingDeletion` state when a grouped ride needs confirmation.
 * Returns `pendingEdit` state when a series ride needs scope selection.
 *
 * The consuming component should render appropriate modals when these are set.
 *
 * @param user - Currently signed-in community user, if any.
 * @param setMyRides - State setter that keeps the local ride list in sync.
 * @param myRides - Current list of user's rides (needed to check for groups).
 */
export const useRideActions = (
  user: CommunityUser | null,
  setMyRides: React.Dispatch<React.SetStateAction<RidePostType[]>>,
  myRides: RidePostType[] = []
) => {
  // Ensure myRides is always an array
  const safeMyRides = Array.isArray(myRides) ? myRides : [];

  // Use a ref to always have access to the current myRides value
  // This prevents stale closure issues in callbacks
  const myRidesRef = useRef<RidePostType[]>(safeMyRides);
  myRidesRef.current = safeMyRides;

  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  /**
   * Get all rides in the same series as the given ride.
   */
  const getSeriesRides = useCallback((ride: RidePostType): RidePostType[] => {
    const currentRides = myRidesRef.current;
    if (!ride.round_trip_group_id || !ride.is_recurring) {
      return [ride];
    }
    return currentRides.filter(
      (r) =>
        r.round_trip_group_id === ride.round_trip_group_id &&
        r.is_recurring &&
        (!r.trip_direction || r.trip_direction === 'departure')
    );
  }, []);

  /**
   * Execute the actual deletion with scope.
   */
  const executeDelete = useCallback(
    async (postId: string, scope: DeleteScope) => {
      try {
        setDeletingPost(postId);
        setPendingDeletion(null);

        // Map scope to API parameter
        const applyTo = scope === 'all' ? 'series' : scope;
        const response = await fetch(`/api/rides/${postId}?apply_to=${applyTo}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete ride');
        }

        // Update local state
        if (result.deletedIds && Array.isArray(result.deletedIds)) {
          setMyRides((posts) => posts.filter((post) => !result.deletedIds.includes(post.id)));
        } else {
          setMyRides((posts) => posts.filter((post) => post.id !== postId));
        }

        // Show success toast
        const deletedCount = result.deletedIds ? result.deletedIds.length : 1;
        toast.success(
          deletedCount === 1
            ? 'Ride deleted successfully'
            : `Successfully deleted ${deletedCount} rides`
        );
      } catch (error) {
        console.error('Error deleting ride:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete ride');
      } finally {
        setDeletingPost(null);
      }
    },
    [setMyRides]
  );

  /**
   * Initiates a delete request. For series rides, sets pending state for scope selection.
   * For single rides, proceeds directly with deletion.
   */
  const deletePost = useCallback(
    async (postId: string) => {
      if (!user) return;

      // Use ref to get current rides (prevents stale closure issues)
      const currentRides = myRidesRef.current;

      // Defensive check: ensure currentRides is an array
      if (!Array.isArray(currentRides) || currentRides.length === 0) {
        console.warn('deletePost called but myRides is empty or invalid');
        toast.error('Unable to delete ride. Please refresh the page and try again.');
        return;
      }

      const rideToDelete = currentRides.find((r) => r.id === postId);
      if (!rideToDelete) {
        console.warn(`deletePost: ride with id ${postId} not found in myRides`);
        toast.error('Ride not found. Please refresh the page and try again.');
        return;
      }

      const hasGroup = !!rideToDelete.round_trip_group_id;
      const isMultiDateSeries = hasGroup && rideToDelete.is_recurring;
      const isRoundTrip = hasGroup && !rideToDelete.is_recurring;

      if (isMultiDateSeries) {
        // Multi-date series - show scope selection modal
        const seriesRides = getSeriesRides(rideToDelete);
        setPendingDeletion({
          postId,
          rideToDelete,
          seriesRides,
          isMultiDateSeries,
          isRoundTrip,
          hasGroup,
        });
      } else if (isRoundTrip) {
        // Round trip - delete both legs directly (no confirmation needed)
        await executeDelete(postId, 'all');
      } else {
        // Single ride - delete directly
        await executeDelete(postId, 'single');
      }
    },
    [user, executeDelete, getSeriesRides]
  );

  /** Cancel a pending deletion */
  const cancelDelete = useCallback(() => {
    setPendingDeletion(null);
  }, []);

  /** Confirm deletion with specific scope */
  const confirmDelete = useCallback(
    async (scope: DeleteScope) => {
      if (!pendingDeletion) return;
      await executeDelete(pendingDeletion.postId, scope);
    },
    [pendingDeletion, executeDelete]
  );

  /**
   * Initiates an edit request. For series rides, sets pending state for scope selection.
   * For single rides, returns the edit URL directly.
   */
  const editPost = useCallback(
    (postId: string): string | null => {
      if (!user) return null;

      // Use ref to get current rides (prevents stale closure issues)
      const currentRides = myRidesRef.current;
      const rideToEdit = currentRides.find((r) => r.id === postId);
      if (!rideToEdit) return null;

      const hasGroup = !!rideToEdit.round_trip_group_id;
      const isMultiDateSeries = hasGroup && rideToEdit.is_recurring;

      if (isMultiDateSeries) {
        // Multi-date series - show scope selection modal
        const seriesRides = getSeriesRides(rideToEdit);
        setPendingEdit({
          postId,
          rideToEdit,
          seriesRides,
          isMultiDateSeries,
        });
        return null; // Indicates modal should be shown
      }

      // Single ride or round trip - navigate directly
      return `/rides/edit/${postId}`;
    },
    [user, getSeriesRides]
  );

  /** Cancel a pending edit */
  const cancelEdit = useCallback(() => {
    setPendingEdit(null);
  }, []);

  /** Get edit URL based on selected scope */
  const getEditUrl = useCallback(
    (scope: EditScope): string | null => {
      if (!pendingEdit) return null;

      const { postId } = pendingEdit;

      switch (scope) {
        case 'single':
          return `/rides/edit/${postId}?mode=single`;
        case 'future':
          return `/rides/edit/${postId}?mode=future`;
        case 'all':
          return `/rides/edit/${postId}?mode=series`;
        default:
          return `/rides/edit/${postId}`;
      }
    },
    [pendingEdit]
  );

  /** Confirm edit scope and return URL to navigate to */
  const confirmEdit = useCallback(
    (scope: EditScope): string | null => {
      const url = getEditUrl(scope);
      setPendingEdit(null);
      return url;
    },
    [getEditUrl]
  );

  return {
    // Delete actions
    deletePost,
    deletingPost,
    pendingDeletion,
    cancelDelete,
    confirmDelete,

    // Edit actions
    editPost,
    pendingEdit,
    cancelEdit,
    confirmEdit,
    getEditUrl,
  };
};
