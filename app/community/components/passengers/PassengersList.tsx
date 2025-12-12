'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProfiles } from '@/libs/community/profilesData';
import PassengerCard from './PassengerCard';
import { PaginationControls } from '../PaginationControls';
import { PassengersLoading } from './PassengersLoading';
import { SectionEmpty } from '../common/SectionEmpty';
import { SectionError } from '../common/SectionError';
import { PASSENGERS_PAGE_SIZE } from '../../constants';
import type { ProfileType, LocationFilterType } from '../../types';
import type { CommunitySupabaseClient } from '@/libs/community/profilesData';

interface PassengersListProps {
  supabase: CommunitySupabaseClient;
  initialPage?: number;
  pageSize?: number;
  locationFilter?: LocationFilterType | null;
}

/**
 * PassengersList component displays a paginated list of passenger profiles.
 * Fetches profiles with role 'passenger' from the database.
 */
export default function PassengersList({
  supabase,
  initialPage = 1,
  pageSize = PASSENGERS_PAGE_SIZE,
  locationFilter,
}: Readonly<PassengersListProps>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [passengers, setPassengers] = useState<ProfileType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPassengers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchProfiles(supabase, currentPage, pageSize);
      setPassengers(response.profiles);
      setTotalCount(response.totalCount);
    } catch (err) {
      console.error('Error loading passengers:', err);
      setError('Failed to load passengers. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, supabase]);

  useEffect(() => {
    loadPassengers();
  }, [loadPassengers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [locationFilter]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return <PassengersLoading />;
  }

  if (error) {
    return <SectionError title="Passengers" message={error} onRetry={loadPassengers} />;
  }

  if (passengers.length === 0) {
    return (
      <SectionEmpty
        title="Passengers"
        message="No Passengers Found"
        subMessage="Check back later for new passengers!"
        icon="👋"
      />
    );
  }

  return (
    <div ref={listRef} className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-slate-400">
          {totalCount} {totalCount === 1 ? 'passenger' : 'passengers'} found
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {passengers.map((passenger) => (
          <PassengerCard key={passenger.id} profile={passenger} />
        ))}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        hasMore={currentPage < totalPages}
        onPageChange={(newPage) => {
          setCurrentPage(newPage);
          listRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
}
