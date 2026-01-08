'use client';

import React from 'react';
import { PassengersSection } from './passengers/PassengersSection';
import { CommunityMembersList } from './members';
import type { RidePostType, ProfileType } from '../types';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';

interface PassengersTabProps {
  user: { id: string } | null;
  supabase: CommunitySupabaseClient;
  // eslint-disable-next-line no-unused-vars
  openMessageModal: (recipient: ProfileType, ridePost: RidePostType) => void;
  initialPage?: number;
  pageSize?: number;
}

/**
 * FindPassengersTab component orchestrates the display of passenger ride requests
 * and community member profiles.
 */
export default function FindPassengersTab({
  user,
  supabase,
  openMessageModal,
  initialPage,
  pageSize,
}: Readonly<PassengersTabProps>) {
  return (
    <div className="space-y-12">
      {/* Section 1: Passenger Ride Requests */}
      <section>
        <PassengersSection
          user={user}
          supabase={supabase}
          openMessageModal={openMessageModal}
          initialPage={initialPage}
          pageSize={pageSize}
        />
      </section>

      {/* Section 2: Community Members */}
      <section>
        <CommunityMembersList supabase={supabase} />
      </section>
    </div>
  );
}
