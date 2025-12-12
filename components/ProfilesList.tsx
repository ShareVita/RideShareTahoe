'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ProfileCard from './ProfileCard';
import { calculateDistance } from '@/libs/distance';
import { PaginationControls } from '@/app/community/components/PaginationControls';

interface Profile {
  id: string;
  first_name: string;
  photo_url: string | null;
  city: string | null;

  bio_excerpt: string | null;
  display_lat?: number;
  display_lng?: number;
  [key: string]: unknown;
}

interface LocationFilter {
  lat: number;
  lng: number;
  radius: number;
}

// Skeleton loader component extracted to prevent recreation
const SkeletonCard = () => (
  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 animate-pulse">
    <div className="flex items-center space-x-3 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded-sm w-24 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded-sm w-32"></div>
      </div>
    </div>
    <div className="mb-3">
      <div className="h-3 bg-gray-200 rounded-sm w-40"></div>
    </div>
    <div className="mb-4">
      <div className="h-3 bg-gray-200 rounded-sm w-full mb-2"></div>
      <div className="h-3 bg-gray-200 rounded-sm w-3/4"></div>
    </div>
    <div className="flex space-x-2">
      <div className="h-8 bg-gray-200 rounded-sm w-20"></div>
      <div className="h-8 bg-gray-200 rounded-sm w-20"></div>
    </div>
  </div>
);

const SKELETON_IDS = Array.from({ length: 6 }, (_, i) => `skeleton-${i}`);
const ITEMS_PER_PAGE = 24;

export default function ProfilesList({
  onMessage,
  locationFilter,
}: {
  // eslint-disable-next-line no-unused-vars
  readonly onMessage: (_profile: Profile) => void;
  readonly locationFilter?: LocationFilter | null;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);

  // Fetch profiles
  const fetchProfiles = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());

      // Add multiple cache-busting parameters
      params.append('_t', Date.now().toString());
      params.append('_r', Math.random().toString(36).substring(7));
      params.append('_v', '1.0.0');

      const response = await fetch(`/api/community/profiles?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setProfiles(data.items);
      setTotalCount(data.totalCount);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and page changes
  useEffect(() => {
    fetchProfiles(currentPage);
  }, [currentPage, fetchProfiles]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [locationFilter]);

  // Filter profiles by location
  const filterProfilesByLocation = (profiles: Profile[], filter: LocationFilter | null) => {
    if (!filter?.lat || !filter.lng) {
      return profiles;
    }

    return profiles.filter((profile) => {
      // Skip profiles without location data
      if (!profile.display_lat || !profile.display_lng) {
        return false;
      }

      const distance = calculateDistance(
        filter.lat,
        filter.lng,
        profile.display_lat,
        profile.display_lng
      );

      return distance <= filter.radius;
    });
  };

  // Then filter by location if filter is active
  const filteredProfiles = locationFilter
    ? filterProfilesByLocation(profiles, locationFilter)
    : profiles;

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => fetchProfiles(currentPage)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div ref={listRef} className="space-y-6">
      {/* Profiles Grid */}
      {!loading && filteredProfiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} onMessage={onMessage} />
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {SKELETON_IDS.map((id) => (
            <SkeletonCard key={id} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filteredProfiles.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasMore={currentPage < totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            listRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* No Profiles State */}
      {!loading && filteredProfiles.length === 0 && profiles.length > 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            No community members available right now
          </h3>
          <p className="text-sm sm:text-base text-gray-600">Check back later for new profiles!</p>
        </div>
      )}

      {/* Empty State (when no profiles at all) */}
      {!loading && profiles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No profiles found</h3>
          <p className="text-sm sm:text-base text-gray-600">Be the first to join the community!</p>
        </div>
      )}
    </div>
  );
}
