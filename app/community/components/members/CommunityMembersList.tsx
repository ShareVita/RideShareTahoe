'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProfiles } from '@/libs/community/profilesData';
import MemberCard from './MemberCard';
import { PaginationControls } from '../PaginationControls';
import { MembersLoading } from './MembersLoading';
import { SectionEmpty } from '../common/SectionEmpty';
import { SectionError } from '../common/SectionError';
import { MEMBERS_PAGE_SIZE } from '../../constants';
import type { ProfileType } from '../../types';
import type { CommunitySupabaseClient } from '@/libs/community/profilesData';

interface CommunityMembersListProps {
  supabase: CommunitySupabaseClient;
  initialPage?: number;
  pageSize?: number;
}

/**
 * CommunityMembersList displays a paginated list of all community members.
 * Shows under both "Find Passengers" and "Find a Driver" tabs.
 */
export default function CommunityMembersList({
  supabase,
  initialPage = 1,
  pageSize = MEMBERS_PAGE_SIZE,
}: Readonly<CommunityMembersListProps>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<ProfileType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchProfiles(supabase, currentPage, pageSize);
      setMembers(response.profiles);
      setTotalCount(response.totalCount);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Failed to load community members. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, supabase]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div ref={listRef}>
      {/* Section Header */}
      <div className="flex items-center mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-50 flex items-center">
          <span className="mr-2">👋</span>
          <span>Community Members</span>
        </h3>
      </div>

      {loading && <MembersLoading />}

      {error && <SectionError title="Community Members" message={error} onRetry={loadMembers} />}

      {!loading && !error && members.length === 0 && (
        <SectionEmpty
          title="Community Members"
          message="No Members Found"
          subMessage="Check back later for new community members!"
          icon="👋"
        />
      )}

      {!loading && !error && members.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {totalCount} {totalCount === 1 ? 'member' : 'members'} found
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <MemberCard key={member.id} profile={member} />
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
      )}
    </div>
  );
}
