'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';
import { fetchPassengerRides } from '@/libs/community/ridesData';
import { PassengerPostCard } from '../passengers-posts/PassengerPostCard';
import { PaginationControls } from '../PaginationControls';
import { LocationFilters } from '../LocationFilters';
import { PassengersLoading } from './PassengersLoading';
import { SectionEmpty } from '../common/SectionEmpty';
import { SectionError } from '../common/SectionError';
import { PASSENGERS_PAGE_SIZE } from '../../constants';
import type { RidePostType, ProfileType, LocationFilterType } from '../../types';
import PostDetailModal from '@/app/community/components/PostDetailModal';

interface PassengersSectionProps {
  user: { id: string } | null;
  supabase: CommunitySupabaseClient;
  // eslint-disable-next-line no-unused-vars
  openMessageModal: (recipient: ProfileType, ridePost: RidePostType) => void;
  initialPage?: number;
  pageSize?: number;
}

/**
 * PassengersSection component displays a paginated list of passenger ride requests.
 * It relies on the shared Supabase client and server-side pagination/filters.
 */
export function PassengersSection({
  user,
  supabase,
  openMessageModal,
  initialPage = 1,
  pageSize = PASSENGERS_PAGE_SIZE,
}: Readonly<PassengersSectionProps>) {
  const tabRef = useRef<HTMLDivElement>(null);
  const [rides, setRides] = useState<RidePostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<RidePostType | null>(null);

  const [currentPage, setCurrentPage] = useState(initialPage);

  const [departureFilter, setDepartureFilter] = useState<LocationFilterType | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<LocationFilterType | null>(null);

  const loadRides = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchPassengerRides(supabase, user, {
        page: currentPage,
        pageSize,
        departureFilter,
        destinationFilter,
      });
      setRides(response.rides);
      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Error loading passenger rides:', err);
      setError('Failed to load passenger requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, departureFilter, destinationFilter, supabase, user]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  useEffect(() => {
    setCurrentPage(1);
  }, [departureFilter, destinationFilter]);

  const ridesFoundLabel = useMemo(() => {
    const base = `${totalCount} ${totalCount === 1 ? 'request' : 'requests'} available`;
    if (departureFilter || destinationFilter) {
      return `${base} matching filters`;
    }
    return base;
  }, [totalCount, departureFilter, destinationFilter]);

  if (loading) {
    return <PassengersLoading />;
  }

  if (error) {
    return (
      <SectionError title="Passengers Looking for Rides" message={error} onRetry={loadRides} />
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div ref={tabRef} className="space-y-6">
      <LocationFilters
        onDepartureFilterChange={setDepartureFilter}
        onDestinationFilterChange={setDestinationFilter}
        ridesFoundLabel={ridesFoundLabel}
      />

      {rides.length === 0 ? (
        <SectionEmpty
          title="Passengers Looking for Rides"
          message="No passengers looking right now"
          subMessage="Be the first to request a ride!"
          icon="👋"
          actionLabel="Request a Ride"
          actionLink="/rides/post"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {rides.map((post) => (
            <PassengerPostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onMessage={openMessageModal}
              onViewDetails={() => setSelectedPost(post)}
            />
          ))}
        </div>
      )}

      {totalCount > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasMore={hasMore}
          onPageChange={(newPage) => {
            setCurrentPage(newPage);
            tabRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {selectedPost && (
        <PostDetailModal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          post={selectedPost}
          currentUserId={user?.id ?? ''}
          onMessage={openMessageModal}
        />
      )}
    </div>
  );
}
