'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  fetchAllRides,
  type FetchAllRidesResponse,
  type CommunitySupabaseClient,
} from '@/libs/community/ridesData';
import { LocationFilters } from './LocationFilters';
import { RidePostCard } from './rides-posts/RidePostCard';
import { PaginationControls } from './PaginationControls';
import { SectionEmpty } from './common/SectionEmpty';
import { SectionError } from './common/SectionError';
import CommunityMembersList from './members/CommunityMembersList';
import { RIDES_PAGE_SIZE } from '../constants';
import type { RidePostType, CommunityUser, LocationFilterType, ProfileType } from '../types';

interface RidesTabProps {
  user: CommunityUser | null;
  supabase: CommunitySupabaseClient;
  initialPage?: number;
  pageSize?: number;
  // eslint-disable-next-line no-unused-vars
  openMessageModal: (recipient: ProfileType, ridePost: RidePostType) => void;
  hideCommunityMembers?: boolean;
}

/**
 * RidesTab component displays a paginated list of all active ride posts.
 * Fetches rides from the database and provides pagination controls.
 */
export function RidesTab({
  user,
  supabase,
  initialPage = 1,
  pageSize = RIDES_PAGE_SIZE,
  openMessageModal,
  hideCommunityMembers = false,
}: Readonly<RidesTabProps>) {
  const tabRef = useRef<HTMLDivElement>(null);
  const [rides, setRides] = useState<RidePostType[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Location filter state
  const [departureFilter, setDepartureFilter] = useState<LocationFilterType | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<LocationFilterType | null>(null);

  // Group round trips together
  const groupedRides = useMemo(() => {
    type OrderedEntry = { type: 'ride'; ride: RidePostType } | { type: 'group'; groupId: string };

    const groupMap = new Map<string, RidePostType[]>();
    const recordedGroups = new Set<string>();
    const orderedEntries: OrderedEntry[] = [];

    for (const ride of rides) {
      if (!ride.round_trip_group_id) {
        orderedEntries.push({ type: 'ride', ride });
        continue;
      }

      const groupId = ride.round_trip_group_id;
      const buffer = groupMap.get(groupId) ?? [];
      buffer.push(ride);
      groupMap.set(groupId, buffer);

      if (!recordedGroups.has(groupId)) {
        recordedGroups.add(groupId);
        orderedEntries.push({ type: 'group', groupId });
      }
    }

    const mergeGroup = (groupRides: RidePostType[]): RidePostType => {
      if (groupRides.length <= 1) {
        return groupRides[0];
      }

      const departureLeg =
        groupRides.find((r) => r.trip_direction === 'departure') || groupRides[0];
      const returnLeg = groupRides.find((r) => r.trip_direction === 'return');

      if (!returnLeg) {
        return departureLeg;
      }

      return {
        ...departureLeg,
        return_date: returnLeg.departure_date,
        return_time: returnLeg.departure_time,
      };
    };

    return orderedEntries
      .map((entry) =>
        entry.type === 'ride' ? entry.ride : mergeGroup(groupMap.get(entry.groupId) ?? [])
      )
      .sort((a, b) => {
        const dateA = new Date(a.departure_date).getTime();
        const dateB = new Date(b.departure_date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = a.departure_time ? a.departure_time.localeCompare(b.departure_time ?? '') : 0;
        if (timeA !== 0) return timeA;
        return a.id.localeCompare(b.id);
      });
  }, [rides]);

  const ridesFoundLabel = useMemo(() => {
    const hasFilters = Boolean(departureFilter || destinationFilter);
    const label = `${totalCount} ${totalCount === 1 ? 'ride' : 'rides'} available`;
    if (hasFilters) {
      return `${label} matching filters`;
    }
    return label;
  }, [totalCount, departureFilter, destinationFilter]);

  const loadRides = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: FetchAllRidesResponse = await fetchAllRides(
        supabase,
        user,
        currentPage,
        pageSize,
        'driver',
        {
          departureFilter,
          destinationFilter,
        }
      );
      setRides(response.rides);
      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Error loading rides:', err);
      setError('Failed to load rides. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, supabase, user, departureFilter, destinationFilter]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [departureFilter, destinationFilter]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const renderRidesSection = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Find a Ride</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((id) => (
              <div
                key={id}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                  <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return <SectionError title="Find a Ride" message={error} onRetry={() => setCurrentPage(1)} />;
    }

    if (rides.length === 0) {
      return (
        <SectionEmpty
          title="Find a Ride"
          message="No Rides Found"
          subMessage="Be the first to post a ride to Tahoe!"
          icon="🚗"
          actionLabel="+ Post a Ride"
          actionLink="/rides/post"
        />
      );
    }

    return (
      <div ref={tabRef} className="space-y-6">
        {/* Location Filters */}
        <LocationFilters
          onDepartureFilterChange={setDepartureFilter}
          onDestinationFilterChange={setDestinationFilter}
          ridesFoundLabel={ridesFoundLabel}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedRides.map((ride) => (
            <RidePostCard
              key={ride.id}
              post={ride}
              currentUserId={user?.id}
              onMessage={openMessageModal}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasMore={hasMore}
          onPageChange={(newPage) => {
            setCurrentPage(newPage);
            tabRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Section 1: Driver Ride Posts */}
      <section>{renderRidesSection()}</section>

      {/* Section 2: Community Members (if not hidden) */}
      {!hideCommunityMembers && (
        <section>
          <CommunityMembersList supabase={supabase} />
        </section>
      )}
    </div>
  );
}
