'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchDrivers, type FetchDriversResponse } from '@/libs/community/driversData';
import { DriverCard } from './DriverCard';
import { PaginationControls } from '../PaginationControls';
import { DriversLoading } from './DriversLoading';
import { SectionEmpty } from '../common/SectionEmpty';
import { SectionError } from '../common/SectionError';
import { DRIVERS_PAGE_SIZE } from '../../constants';
import type { ProfileType } from '../../types';

interface DriversTabProps {
  initialPage?: number;
  pageSize?: number;
}

/**
 * DriversTab component displays a paginated list of driver profiles.
 * Fetches drivers from the database and provides pagination controls.
 */
export function DriversTab({
  initialPage = 1,
  pageSize = DRIVERS_PAGE_SIZE,
}: Readonly<DriversTabProps>) {
  const tabRef = useRef<HTMLDivElement>(null);
  const [drivers, setDrivers] = useState<ProfileType[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const response: FetchDriversResponse = await fetchDrivers(supabase, currentPage, pageSize);
      setDrivers(response.drivers);
      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Error loading drivers:', err);
      setError('Failed to load drivers. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadDrivers();
  }, [currentPage, pageSize, loadDrivers]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return <DriversLoading />;
  }

  if (error) {
    return <SectionError title="Drivers" message={error} onRetry={() => setCurrentPage(1)} />;
  }

  if (drivers.length === 0) {
    return (
      <SectionEmpty
        title="Drivers"
        message="No Drivers Found"
        subMessage="Check back later for drivers heading to Tahoe!"
        icon="🚗"
      />
    );
  }

  return (
    <div ref={tabRef} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Drivers</h2>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          {totalCount} {totalCount === 1 ? 'driver' : 'drivers'} available
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <DriverCard key={driver.id} driver={driver} />
        ))}
      </div>

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
}
