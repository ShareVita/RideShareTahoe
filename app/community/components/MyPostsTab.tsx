<<<<<<< HEAD
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { RidePostCard } from '@/app/community/components/rides-posts/RidePostCard';
import type { RidePostType, ProfileType } from '../types';
import PostDetailModal from '@/app/community/components/PostDetailModal';
=======
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { formatDateLong, formatDateMedium, formatTime12Hour } from '@/libs/dateTimeFormatters';
import ScopeSelectionModal, { ScopeType } from '@/components/rides/ScopeSelectionModal';
import SeriesViewModal from '@/components/rides/SeriesViewModal';
import type { RidePostType } from '../types';
>>>>>>> a510e1a (refactor: integrate multi-date series into community pages and forms)

interface MyRidesTabProps {
  myRides: RidePostType[];
  setMyRides?: React.Dispatch<React.SetStateAction<RidePostType[]>>;
  // eslint-disable-next-line no-unused-vars
  deletePost: (postId: string) => Promise<void>;
  deletingPost: string | null;
  // eslint-disable-next-line no-unused-vars
  onDeleteWithScope?: (postId: string, scope: ScopeType) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

/**
 * Displays user's ride posts as individual cards.
 * Series rides show a "Recurring" badge and "View series" link.
 * Delete/Edit for series rides show scope selection modal.
 */
export function MyPostsTab({
  myRides,
  setMyRides,
  deletePost,
  deletingPost,
  onDeleteWithScope,
  onRefresh,
}: Readonly<MyRidesTabProps>) {
<<<<<<< HEAD
  const [selectedPost, setSelectedPost] = useState<RidePostType | null>(null);
  // Group round trips together
  const groupedRides = useMemo(() => {
    const groups: { [key: string]: RidePostType[] } = {};
    const standalone: RidePostType[] = [];
=======
  const router = useRouter();
>>>>>>> a510e1a (refactor: integrate multi-date series into community pages and forms)

  // Modal states
  const [deleteModalRide, setDeleteModalRide] = useState<RidePostType | null>(null);
  const [editModalRide, setEditModalRide] = useState<RidePostType | null>(null);
  const [seriesViewRide, setSeriesViewRide] = useState<RidePostType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get only departure legs for display (not return legs)
  const displayRides = useMemo(() => {
    return myRides
      .filter((r) => !r.trip_direction || r.trip_direction === 'departure')
      .sort((a, b) => {
        // Sort by departure date (upcoming first), then by created_at
        const dateCompare = a.departure_date.localeCompare(b.departure_date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [myRides]);

  // Get all rides in a series
  const getSeriesRides = (ride: RidePostType): RidePostType[] => {
    if (!ride.round_trip_group_id || !ride.is_recurring) {
      return [ride];
    }
    return myRides
      .filter(
        (r) =>
          r.round_trip_group_id === ride.round_trip_group_id &&
          r.is_recurring &&
          (!r.trip_direction || r.trip_direction === 'departure')
      )
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  };

  // Handle delete button click
  const handleDeleteClick = (ride: RidePostType) => {
    const isMultiDateSeries = ride.round_trip_group_id && ride.is_recurring;

    if (isMultiDateSeries) {
      setDeleteModalRide(ride);
    } else {
      // Single ride or round trip - delete directly
      deletePost(ride.id);
    }
  };

  // Handle edit button click
  const handleEditClick = (ride: RidePostType) => {
    const isMultiDateSeries = ride.round_trip_group_id && ride.is_recurring;

    if (isMultiDateSeries) {
      setEditModalRide(ride);
    } else {
      // Single ride - navigate directly
      router.push(`/rides/edit/${ride.id}`);
    }
  };

  // Handle delete scope selection
  const handleDeleteConfirm = async (scope: ScopeType) => {
    if (!deleteModalRide) return;

    setIsDeleting(true);
    try {
      if (onDeleteWithScope) {
        await onDeleteWithScope(deleteModalRide.id, scope);
      } else {
        // Fallback to API call
        const applyTo = scope === 'all' ? 'series' : scope;
        const response = await fetch(`/api/rides/${deleteModalRide.id}?apply_to=${applyTo}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete');
        }

        // Get the IDs to remove - for series deletion, compute all IDs in the group
        let idsToRemove: string[] = [];
        if (result.deletedIds && Array.isArray(result.deletedIds)) {
          idsToRemove = result.deletedIds;
        } else if (scope === 'all' && deleteModalRide.round_trip_group_id) {
          // Fallback: if API didn't return IDs, compute from local state
          idsToRemove = myRides
            .filter((r) => r.round_trip_group_id === deleteModalRide.round_trip_group_id)
            .map((r) => r.id);
        } else if (scope === 'future' && deleteModalRide.round_trip_group_id) {
          // Fallback: compute future rides from local state
          idsToRemove = myRides
            .filter(
              (r) =>
                r.round_trip_group_id === deleteModalRide.round_trip_group_id &&
                r.departure_date >= deleteModalRide.departure_date
            )
            .map((r) => r.id);
        } else {
          idsToRemove = [deleteModalRide.id];
        }

        // Show success toast
        const deletedCount = idsToRemove.length;
        toast.success(
          deletedCount === 1
            ? 'Ride deleted successfully'
            : `Successfully deleted ${deletedCount} rides`
        );

        // Refresh data to update the UI
        if (onRefresh) {
          await onRefresh();
        } else if (typeof setMyRides === 'function' && idsToRemove.length > 0) {
          // Fallback: update local state directly
          setMyRides((prev) => prev.filter((ride) => !idsToRemove.includes(ride.id)));
        }
      }
    } catch (error) {
      console.error('Error deleting ride:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete ride');
    } finally {
      setIsDeleting(false);
      setDeleteModalRide(null);
    }
  };

  // Handle edit scope selection
  const handleEditConfirm = (scope: ScopeType) => {
    if (!editModalRide) return;

    let url = `/rides/edit/${editModalRide.id}`;
    switch (scope) {
      case 'single':
        url += '?mode=single';
        break;
      case 'future':
        url += '?mode=future';
        break;
      case 'all':
        url += '?mode=series';
        break;
    }

    setEditModalRide(null);
    router.push(url);
  };

  // Individual ride card component
  const RideCard = ({ ride }: { ride: RidePostType }) => {
    const isMultiDateSeries = ride.round_trip_group_id && ride.is_recurring;
    const seriesRides = isMultiDateSeries ? getSeriesRides(ride) : [];
    const seriesCount = seriesRides.length;

    // Find return leg if this is a round trip
    const returnLeg = myRides.find(
      (r) =>
        r.round_trip_group_id === ride.round_trip_group_id &&
        r.trip_direction === 'return' &&
        r.id !== ride.id
    );

    const hasReturn = !!returnLeg || (ride.return_date && ride.return_time);

    // Type badge
    const TypeBadge = () => {
      const config = {
        driver: {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-800 dark:text-blue-300',
          label: 'Driver',
        },
        passenger: {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-300',
          label: 'Passenger',
        },
        flexible: {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-800 dark:text-purple-300',
          label: 'Flexible',
        },
      };
      const { bg, text, label } = config[ride.posting_type] || config.flexible;
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
        >
          {label}
        </span>
      );
    };

    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-slate-800 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
              {ride.title || 'Untitled Ride'}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <TypeBadge />
              {hasReturn && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                  Round Trip
                </span>
              )}
              {isMultiDateSeries && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  Recurring
                </span>
              )}
            </div>
          </div>

          {/* Price and Seats */}
          <div className="flex flex-col items-end shrink-0">
            {ride.posting_type === 'driver' && (
              <>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {ride.price_per_seat ? `$${ride.price_per_seat}` : 'Free'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {ride.available_seats ?? ride.total_seats ?? 0} seats left
                </span>
              </>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="mb-4">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 mb-2">
            <span className="font-medium w-12 text-gray-500 dark:text-gray-400">From:</span>
            <span className="truncate flex-1">{ride.start_location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium w-12 text-gray-500 dark:text-gray-400">To:</span>
            <span className="truncate flex-1">{ride.end_location}</span>
          </div>
        </div>

        {/* Schedule */}
        <div className="mb-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Departure: {formatDateLong(ride.departure_date)} at{' '}
            {formatTime12Hour(ride.departure_time)}
          </div>
          {hasReturn && (
            <div>
              Return:{' '}
              {returnLeg
                ? `${formatDateLong(returnLeg.departure_date)} at ${formatTime12Hour(returnLeg.departure_time)}`
                : ride.return_date && ride.return_time
                  ? `${formatDateLong(ride.return_date)} at ${formatTime12Hour(ride.return_time)}`
                  : ''}
            </div>
          )}
        </div>

        {/* Round Trip Info */}
        {hasReturn && !isMultiDateSeries && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
            <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2">
              Round Trip
            </div>
            <div className="space-y-1">
              <div className="text-xs text-indigo-800 dark:text-indigo-200">
                Outbound: {formatDateMedium(ride.departure_date)}
              </div>
              <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                Return:{' '}
                {returnLeg
                  ? formatDateMedium(returnLeg.departure_date)
                  : ride.return_date
                    ? formatDateMedium(ride.return_date)
                    : 'TBD'}
              </div>
            </div>
          </div>
        )}

        {/* Series Info */}
        {isMultiDateSeries && seriesCount > 1 && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
            <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2">
              Part of a {seriesCount}-ride series
            </div>
            <div className="space-y-1">
              {seriesRides.map((seriesRide) => (
                <div
                  key={seriesRide.id}
                  className={`text-xs ${
                    seriesRide.id === ride.id
                      ? 'font-semibold text-indigo-800 dark:text-indigo-200'
                      : 'text-indigo-600/70 dark:text-indigo-400/70'
                  }`}
                >
                  {seriesRide.id === ride.id && '→ '}
                  {formatDateMedium(seriesRide.departure_date)}
                  {seriesRide.id === ride.id && ' (this ride)'}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSeriesViewRide(ride)}
              className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View full series →
            </button>
          </div>
        )}

        {/* Spacer to push vehicle/description to bottom for non-series cards */}
        <div className="grow" />

        {/* Vehicle Info */}
        {ride.posting_type === 'driver' && ride.car_type && (
          <div className="mb-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p className="line-clamp-2">Vehicle: {ride.car_type}</p>
          </div>
        )}

        {/* Description */}
        {ride.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              {ride.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleEditClick(ride)}
            className="flex-1 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDeleteClick(ride)}
            disabled={deletingPost === ride.id}
            className="flex-1 rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {deletingPost === ride.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    );
  };

  const postsSummary = `${displayRides.length} ${displayRides.length === 1 ? 'ride' : 'rides'}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <p className="text-sm text-gray-600 dark:text-gray-400">{postsSummary}</p>
      </div>

      {displayRides.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
<<<<<<< HEAD
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
=======
          {displayRides.map((ride) => (
            <RideCard key={ride.id} ride={ride} />
>>>>>>> a510e1a (refactor: integrate multi-date series into community pages and forms)
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
<<<<<<< HEAD
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
=======

      {/* Delete Scope Modal */}
      {deleteModalRide && (
        <ScopeSelectionModal
          isOpen={!!deleteModalRide}
          onClose={() => setDeleteModalRide(null)}
          ride={deleteModalRide}
          seriesRides={getSeriesRides(deleteModalRide)}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
          variant="delete"
        />
      )}

      {/* Edit Scope Modal */}
      {editModalRide && (
        <ScopeSelectionModal
          isOpen={!!editModalRide}
          onClose={() => setEditModalRide(null)}
          ride={editModalRide}
          seriesRides={getSeriesRides(editModalRide)}
          onConfirm={handleEditConfirm}
          variant="edit"
        />
      )}

      {/* Series View Modal */}
      {seriesViewRide && (
        <SeriesViewModal
          isOpen={!!seriesViewRide}
          onClose={() => setSeriesViewRide(null)}
          rides={getSeriesRides(seriesViewRide)}
>>>>>>> a510e1a (refactor: integrate multi-date series into community pages and forms)
        />
      )}
    </div>
  );
}
